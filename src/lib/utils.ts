import type { MakeSessionOptions } from '$lib';
import type { ServerResponse } from '@sveltejs/kit/types/hooks';
import cookie from 'cookie';

/**
 * Utility function used to throw errors when desctructuring a non existing value
 *
 * @example
 * const {
 *   optionalKey,
 *   requiredKey = Required("requiredKey must be defined")
 * } = options
 *
 * @example
 * function foo(requiredParam = Required("requiredParam must be defined"), optionalParam = "defaultValue") {}
 */
export const Required = (error: string) => {
	throw new Error(error);
};

/**
 * Utility function to set default values for an object if they are not defined
 *
 * ! This function mutates the object. If you use spread, it won't work.
 */
export const setDefaults = (obj: Record<string, any>, defaults: Record<string, any>) => {
	for (const key in defaults) {
		if (obj[key] === undefined) {
			obj[key] = defaults[key];
		}
	}
};

/**
 * Utility function to add a cookie to a response
 */
export const addCookie = (
	response: ServerResponse,
	opts: MakeSessionOptions['cookie'] & { value: string }
) => {
	const existingCookie = response.headers['set-cookie'] || [];
	const newCookie = cookie.serialize(opts.name, opts.value, opts);
	if (Array.isArray(existingCookie)) {
		response.headers['set-cookie'] = [...existingCookie, newCookie];
	} else {
		response.headers['set-cookie'] = [existingCookie, newCookie];
	}
};
