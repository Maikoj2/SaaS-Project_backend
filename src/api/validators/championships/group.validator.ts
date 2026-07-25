import { body, query } from 'express-validator';

import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';



const groupValidator = {
    getGroupsByChampionship: [
        ...paramsValidator('championshipId', true),
        validate,
    ],
    getGroupById: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupId', true),
        validate,
    ],
    getGroupStandings: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupId', true),
        validate,
    ],
    getGroupsByGroupDistribution: [
        ...paramsValidator('groupDistributionId', true),
        validate,
    ],
}

export default groupValidator;
