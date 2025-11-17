const Joi = require('joi');

const questionSchema = Joi.object({
	id: Joi.string().required(),
	question: Joi.string().min(5).required(),
	choices: Joi.array().items(Joi.string().min(1)).length(4).required(),
	correct_index: Joi.number().integer().min(0).max(3).required(),
	hint: Joi.string().allow('').optional()
});

const questionsSchema = Joi.array().items(questionSchema).min(1).required();

function validateQuestions(payload) {
	return questionsSchema.validate(payload, { abortEarly: false });
}

module.exports = { validateQuestions };