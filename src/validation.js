const Joi = require("joi")

module.exports = Joi.object()
	.strict(true)
	.keys({
		offense: Joi.object().keys({
			passingYards: Joi.number().required(),
			passingTDs: Joi.number().required(),
			ints: Joi.number().required(),
			rushingYards: Joi.number().required(),
			rushingTDs: Joi.number().required(),
			receptions: Joi.number().required(),
			receivingYards: Joi.number().required(),
			receivingTDs: Joi.number().required(),
			bonusPoints: Joi.object().keys({
				points: Joi.number().required(),
				passingYards: Joi.number().required(),
				rushingYards: Joi.number().required(),
				receivingYards: Joi.number().required(),
			}),
		}),
		defense: Joi.object().keys({
			sacks: Joi.number().required(),
			ints: Joi.number().required(),
			fumblesRec: Joi.number().required(),
			TDs: Joi.number().required(),
			safeties: Joi.number().required(),
			pointsAllowedUpTo: Joi.object().keys({
				0: Joi.number().required(),
				6: Joi.number().required(),
				13: Joi.number().required(),
				20: Joi.number().required(),
				27: Joi.number().required(),
				34: Joi.number().required(),
				else: Joi.number().required(),
			}),
		}),
		kickers: Joi.object().keys({
			patMade: Joi.number().required(),
			fieldGoalYards: Joi.number().required(),
			distanceUpTo: Joi.object().keys({
				19: Joi.number().required(),
				29: Joi.number().required(),
				39: Joi.number().required(),
				49: Joi.number().required(),
				else: Joi.number().required(),
			}),
		}),
		csvOptions: Joi.object().keys({
			QBs: Joi.number().integer().min(0).required(),
			RBs: Joi.number().integer().min(0).required(),
			WRs: Joi.number().integer().min(0).required(),
			TEs: Joi.number().integer().min(0).required(),
			Ks: Joi.number().integer().min(0).required(),
			DEFs: Joi.number().integer().min(0).required(),
		}),
	})
