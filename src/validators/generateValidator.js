const Joi = require('joi');

function validateGenerateQuery(query) {
  const schema = Joi.object({
    tutorial_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    user_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  });
  return schema.validate(query);
}

module.exports = { validateGenerateQuery };
