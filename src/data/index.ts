import buildablesData from '../data/buildables.json';
import pavingData from '../data/paving.json';
import { BuildableItemData, PavingTypeData } from '@models/types';

export const buildableItems = buildablesData as BuildableItemData[];
export const pavingTypes = pavingData as PavingTypeData[];
