# SvelteKit Stateless Session

A stateless session for SvelteKit-based apps

## Wait, stateless sessions?

Yes, you read that right! Using [`@hapi/iron`](https://hapi.dev/module/iron) for encryption, you can take JSON data, convert it to a token, and send it to a client. When a new request arrives, you can take that token, decode it, and get back the exact same JSON data you put in. It is similar to JWTs but when using this project with it, you end up with an experience similar to regular server-side session, only without the drawbacks of being stateful.

This project is glue between Iron and SvelteKit to set-up the server-side session experience, so the stateless magic is the result of the effort of the maintainers of Iron, not me.

## Installation

Install `@dodiameer/sk-stateless-session` with npm, pnpm, or yarn

```bash
npm install @dodiameer/sk-stateless-session
```

```bash
pnpm install @dodiameer/sk-stateless-session
```

```bash
yarn add @dodiameer/sk-stateless-session
```

## Usage

### General setup

In your `src/hooks.ts` / `src/hooks/index.ts`, add the following code:

```ts
import { statelessSession } from '@dodiameer/sk-stateless-session';

export const handle = statelessSession({
	// See parts below for options
});

export const getSession = ({ locals }) => {
	return locals.session.data;
};
```

If you have other hooks, you can use the `sequence` helper from SvelteKit:

```ts
import { sequence } from '@sveltejs/kit/hooks';
import { statelessSession } from '@dodiameer/sk-stateless-session';
import someOtherHook from './someOtherHook';

export const handle = sequence(
	someOtherHook,
	statelessSession({
		// See parts below for options
	})
);
```

### Cookie based

Add `getSessionIdFromCookie` to your import:

```ts
// import { statelessSession } from "@dodiameer/sk-stateless-session"
import { statelessSession, getSessionIdFromCookie } from '@dodiameer/sk-stateless-session';
```

Then set your options:

```ts
export const handle = statelessSession({
	// "custom-cookie" is optional, you don't need it if you're not using a custom cookie name
	getSessionId: getSessionIdFromCookie('custom-cookie-name'),
	secret: process.env.SESSION_SECRET,
	// This part is also optional if you don't want to use a custom cookie name
	cookie: {
		name: 'custom-cookie-name'
	}
});
```

### Custom setup

If you want to get the session id from a header and send new session ids through a header instead of using cookies, you can do the following:

```ts
export const handle = statelessSession({
	getSessionId: (request) => {
		// `request` is the same request you'd get in hooks. Do whatever you want with it here
		// You must return a string that's a session ID or null
		return sessionId || null;
	},
	secret: process.env.SESSION_SECRET,
	// Instead of sending a cookie, send the session id in "x-session-id" header (or another name you want)
	customHeader: 'x-session-id'
});
```

**NOTE:** The session ID gets changed every time session data changes, so keep that in mind when using a custom setup to handle that in your frontend.

## Options

This is copy-pasted from the code. You'll also get the descriptions in your code editor if it supports JSDoc comments

```ts
interface MakeSessionOptions {
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
```

## Credit

- [`svelte-kit-cookie-session`](https://github.com/pixelmund/svelte-kit-cookie-session) for inspiration for this project. My project uses a similar API to access the session data, but I added some features I wanted to use.
- [`iron-store`](https://github.com/vvo/iron-store) for providing a low-level store/session implementation with `@hapi/iron`. I used their codebase as a reference a few times while writing this project.

## License

[MIT](https://choosealicense.com/licenses/mit/)
