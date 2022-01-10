import { statelessSession, getSessionIdFromCookie } from '$lib';
import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(
	statelessSession({
		secret: 'password'.repeat(4),
		getSessionId: getSessionIdFromCookie()
	})
);

export const getSession = ({ locals }) => locals.session.data;
