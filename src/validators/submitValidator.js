const Joi = require("joi");

exports.validateSubmitPayload = (body) => {
  const schema = Joi.object({
    tutorial_id: Joi.string().required(),
    user_id: Joi.string().required(),
    questions: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          question_text: Joi.string().required(),
          options: Joi.array().items(Joi.string()).min(2).required(),
          correct_answer: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ).required(),
          user_answer: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string()),
            Joi.valid(null)
          ).required()
        })
      )
      .min(1)
      .required()
  });

  return schema.validate(body);
};
