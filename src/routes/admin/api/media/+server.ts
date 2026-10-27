import { error, json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { listMedia, storeUpload, UploadError } from '#lib/server/media.ts';
import type { RequestHandler } from './$types';

/** The media library for the picker: `?pagina=N&q=…` */
export const GET: RequestHandler = async ({ locals, url }) => {
	requireUser(locals);
	const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
	return json(await listMedia(page, url.searchParams.get('q')?.trim() ?? ''));
};

/** Upload of an image already resized in the browser (see `src/lib/admin/image.ts`) */
export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requireUser(locals);
	try {
		return json(await storeUpload(await request.formData(), user.id), { status: 201 });
	} catch (e) {
		if (e instanceof UploadError) error(400, e.message);
		throw e;
	}
};
