import assert from "node:assert/strict";
import test from "node:test";
import { createChatResponse, createEmbeddings } from "../controllers/aiController.js";

const createResponse = () => ({
	statusCode: 200,
	body: null,
	status(code) {
		this.statusCode = code;
		return this;
	},
	json(body) {
		this.body = body;
		return this;
	},
});

test("embedding endpoint rejects invalid task types", async () => {
	const response = createResponse();
	await createEmbeddings({ body: { texts: ["notes"], taskType: "INVALID" } }, response);

	assert.equal(response.statusCode, 400);
	assert.equal(response.body.message, "Invalid embedding request.");
});

test("study chat requires retrieved material context", async () => {
	const response = createResponse();
	await createChatResponse({ body: { question: "Explain this", mode: "study" } }, response);

	assert.equal(response.statusCode, 400);
	assert.equal(response.body.message, "Index study materials before asking a study question.");
});

test("AI endpoints report missing Gemini configuration without calling the provider", async () => {
	const previousKey = process.env.GEMINI_API_KEY;
	delete process.env.GEMINI_API_KEY;

	try {
		const response = createResponse();
		await createChatResponse({ body: { question: "Explain entropy", mode: "general" } }, response);

		assert.equal(response.statusCode, 503);
		assert.match(response.body.message, /GEMINI_API_KEY/);
	} finally {
		if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
		else process.env.GEMINI_API_KEY = previousKey;
	}
});
