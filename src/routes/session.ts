import type { RequestHandler } from '@sveltejs/kit';

export const post: RequestHandler = async ({ locals }) => {
	locals.session.data.user = {
		name: 'John Doe',
		email: 'john@example.com'
	};
	return {
		status: 204
	};
};

export const del: RequestHandler = async ({ locals }) => {
	locals.session.clear();
	return {
		status: 204
	};
};
