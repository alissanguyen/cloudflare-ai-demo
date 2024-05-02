/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { sanitizeInput } from "./utils";

export interface Env {
	AI: any;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	// 'content-type': 'image/png',
};

// https://developers.cloudflare.com/workers-ai/models/
const models = {
	image: '@cf/bytedance/stable-diffusion-xl-lightning',
	imageUpgraded: '@cf/lykon/dreamshaper-8-lcm',
	textGeneration: '@hf/thebloke/llama-2-13b-chat-awq',
	textGenerationUpgraded: '@cf/meta/llama-3-8b-instruct',
	imageClassification: '@cf/microsoft/resnet-50',
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			// Handle CORS preflight requests
			return new Response(null, {
				headers: corsHeaders,
			});
		}
		

		/**
		 * To handle the initial page load and prevent the page from crashing,
		 * we check if the request method is GET and return a default response:
		 */
		if (request.method === 'GET') {
			// Handle initial page load or GET requests
			return new Response('Welcome to the Cloudflare Worker!', {
				headers: {
					'Content-Type': 'text/plain',
					...corsHeaders,
				},
			});
		}

		const json: any = await readRequestBody(request);
		console.log(json, 'json - line 44');

		if (json.model === 'imageClassification') {
			// Handle image classification
			const imageData = json.image;
			if (!imageData || !Array.isArray(imageData)) {
				return new Response(null, { status: 400, statusText: 'Invalid image data' });
			}

			const response = await env.AI.run(models.imageClassification, { image: imageData });
			const newHeaders = new Headers(response.headers);

			for (const header in corsHeaders) {
				// @ts-expect-error
				newHeaders.set(header, corsHeaders[header]);
			}

			newHeaders.set('Content-Type', 'application/json');
			const jsonResponse = JSON.stringify(response);
			console.log('IMAGE CLASSIFICATION JSON', jsonResponse);
			return new Response(jsonResponse, { headers: newHeaders });
		} else {
			// Handle other models
			if (!json.prompt) {
				return new Response(null, { status: 400, statusText: '1 -- undefined/null input submitted' });
			}

			if (typeof json.prompt !== 'string') {
				return new Response(null, { status: 400, statusText: '2 -- invalid input, string expected, not string' });
			}

			if (json.prompt.length === 0) {
				return new Response(null, { status: 400, statusText: '3 -- empty input submitted' });
			}

			if (json.prompt.length > 25000) {
				return new Response(null, { status: 400, statusText: "4 -- i'm not that smart yet, ask something shorter please" });
			}

			// Validate and sanitize the prompt
			const sanitizedPrompt = sanitizeInput(json.prompt);

			/**
			 * Each time a message is sent and a AI response is generated
			 * save both to a database under a conversation ID
			 *
			 * When processing the next chat message, pull all the previous messages
			 * and then append the new message to the end before calling the AI
			 */

			// @ts-ignore
			const response = await env.AI.run(models[json.model], { prompt: sanitizedPrompt });

			const newHeaders = new Headers(response.headers);

			for (const header in corsHeaders) {
				// @ts-expect-error
				newHeaders.set(header, corsHeaders[header]);
			}

			if (json.model === 'image' || json.model === 'imageUpgraded') {
				// Handle image response
				newHeaders.set('Content-Type', 'image/png');
				return new Response(response, { headers: newHeaders });
			} else if (json.model === 'textGeneration' || json.model === 'textGenerationUpgraded') {
				// Handle text response
				newHeaders.set('Content-Type', 'application/json');
				const jsonResponse = JSON.stringify({ data: response });
				return new Response(jsonResponse, { headers: newHeaders });
			} else {
				// Handle other cases or return an error response
				return new Response('Unsupported model', { status: 400 });
			}
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * readRequestBody reads in the incoming request body
 * Use await readRequestBody(..) in an async function to get the string
 * @param {Request} request the incoming request to read from
 */
async function readRequestBody(request: Request) {
	const contentType = request.headers.get('content-type');

	if (!contentType) {
		return {};
	}

	console.log('content type', contentType, request.body);

	if (contentType.includes('application/json')) {
		return JSON.parse(JSON.stringify(await request.json()));
	} else if (contentType.includes('application/text')) {
		return request.text();
	} else if (contentType.includes('text/html')) {
		return request.text();
	} else if (contentType.includes('form')) {
		const formData = await request.formData();
		const body = {};
		for (const entry of formData.entries()) {
			(body as any)[entry[0]] = entry[1];
		}
		return JSON.stringify(body);
	} else {
		// Perhaps some other type of data was submitted in the form
		// like an image, or some other binary data.
		return 'a file';
	}
}
