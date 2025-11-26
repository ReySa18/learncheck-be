const Joi = require('joi');

const questionSchema = Joi.object({
  id: Joi.string().required(),
  question: Joi.string().min(5).required(),

  choices: Joi.array()
    .items(Joi.string().min(1))
    .min(4)
    .max(6)
    .required(),

  correct_index: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.array().items(Joi.number().integer().min(0)).min(1)
  ).required(),

  hint: Joi.string().allow('').optional(),
});

const questionsSchema = Joi.array().items(questionSchema).min(1).required();

function validateQuestions(payload) {
  return questionsSchema.validate(payload, { abortEarly: false });
}

module.exports = { validateQuestions };
