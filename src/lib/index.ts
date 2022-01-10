import Iron from '@hapi/iron';
import cookie from 'cookie';
import type { CookieSerializeOptions } from 'cookie';
import type { Handle } from '@sveltejs/kit';
import type { ServerRequest } from '@sveltejs/kit/types/hooks';
import { addCookie, Required, setDefaults } from './utils';

export interface MakeSessionOptions {
	/**
	 * Used to get the session id from the request.
	 *
	 * **Note**: If you store your session id in a cookie,
	 * your can use `getSessionIdFromCookie` provided by this package.
	 * @example
	 * const getSeal = (request) => {
	 *   const authToken = request.headers.authorization.replace('Bearer ', '') || null;
	 *   return authToken;
	 * }
	 */
	getSessionId: (request: ServerRequest) => string;
	/** Session secret */
	secret: string;
	/**
	 * Session expiration time in milliseconds. `0` means no expiration.
	 *
	 * @default 0 (no expiration)
	 */
	expiresIn?: number;
	/**
	 * If set, will return session id as a header with the provided name,
	 * and will NOT set a cookie. If not set, will set a cookie with the session id.
	 */
	customHeader?: string | false;
	/** Cookie options */
	cookie?: {
		/**
		 * Cookie name
		 *
		 * @default "sk-stateless-session"
		 */
		name?: string;
	} & Pick<CookieSerializeOptions, 'maxAge' | 'path' | 'secure' | 'httpOnly'>;
}

export type Session<Data = any> = {
	data: Data;
	clear: () => boolean;
};

/**
 * Gets the session id from the cookie provided
 * @param cookieName Cookie that stores the session id @default "sk-stateless-session"
 *
 * @example
 * statelessSession({
 *   getSessionId: getSessionIdFromCookie("session-id"),
 *   cookie: {
 *     name: "session-id"
 *   }
 * })
 */
export const getSessionIdFromCookie: (cookieName?: string) => MakeSessionOptions['getSessionId'] =
	(cookieName = 'sk-stateless-session') =>
	(request) => {
		const cookies = cookie.parse(request.headers.cookie || '');
		return cookies[cookieName] || null;
	};

export const statelessSession: <SessionData>(
	opts: MakeSessionOptions
) => Handle<{ session: Session<SessionData> }> =
	(opts) =>
	async ({ request, resolve }) => {
		/*
      Okay, I have to admit; This isn't the cleanest code I've ever written.
      I'm sorry.

      Jk. It's not that bad.
      But it's not that good either.
    */
		const {
			getSessionId = Required('getSessionId must be defined'),
			secret = Required('session secret must be defined'),
			expiresIn = 0,
			customHeader = false,
			cookie = {}
		} = opts;

		setDefaults(cookie, {
			// It'd be a REALLY bad idea to set maxAge to 0, default to 7 days if session doesn't expire
			maxAge: expiresIn !== 0 ? expiresIn : 60 * 60 * 24 * 7,
			path: '/',
			secure: import.meta.env.PROD,
			httpOnly: true,
			name: 'sk-stateless-session'
		});

		// This function is provided by the user, it just returns the seal from the request or null if it doesn't exist
		const seal = getSessionId(request);
		const sessionData = seal
			? await Iron.unseal(seal, secret, {
					...Iron.defaults,
					ttl: expiresIn
			  })
			: {};

		// This will determine if we need to regenerate the session id
		let shouldReseal = false;

		// Create a proxy around the session data
		// that sets `shouldReseal` to true when any property is set
		//
		// It's a function because it's used multiple times, but it
		// cannot be defined outside of here because it needs to be
		// able to set `shouldReseal`
		const makeDataProxy = (obj) => {
			return new Proxy(obj, {
				set: (target, prop, value) => {
					target[prop] = value;
					shouldReseal = true;
					return true;
				}
			});
		};

		// DIRTY HACKS: We need a clear function that re-sets the
		// session data to an empty object, but we also need it to
		// make the data a proxy because the user might want to clear
		// the session data in the middle of a request and then set new data.
		//
		// To solve that we define a variable called session and then use
		// Object.assign to add a new object with the clear function, that
		// way the clear function can reference the session object.
		const session = {
			data: makeDataProxy(sessionData)
		};

		//!NOTE: We're assigning the clear function to the session object WITHOUT cloning it.
		// If we clone it, clear won't be able to reference the session object because it was cloned
		Object.assign(session, {
			clear: () => {
				session.data = makeDataProxy({});
				shouldReseal = true;
				return true;
			}
		});

		/*
      Assuming the user wants to do `session.data = { foo: 'bar', baz: 'qux' }`,
      we have to make the object they provide a proxy so it still does the shouldReseal thing.
      We also want to prevent the user from setting properties on the session object directly.

      To solve that we create a proxy... Follow comments below
    */
		const sessionProxy = new Proxy(session, {
			set: (target, prop, value) => {
				if (prop === 'data') {
					// User is trying to set the session data,
					// make value a proxy and set it to the session.data
					target[prop] = makeDataProxy(value);
					// Data was set, so we need to re-seal the session
					shouldReseal = true;
					return true;
				} else {
					// User is trying to set a property on the session object
					// that isn't `data`, so we don't want to allow it
					return false;
				}
			}
		});

		// @ts-expect-error It expects `Session<SessionData>`, but we're using a proxy so TS will throw a tantrum
		request.locals.session = sessionProxy;
		const response = await resolve(request);
		if (shouldReseal) {
			const seal = await Iron.seal(sessionProxy.data, secret, Iron.defaults);
			// If the user is using a custom header, we don't want to set a cookie,
			// just set that response header and move on
			customHeader
				? (response.headers[customHeader] = seal)
				: addCookie(response, {
						...cookie,
						value: seal
				  });
		}
		return response;
	};
