import { Router } from 'express';
import {
    getAllSettings,
    getSettingById,
    createSetting,
    updateSetting,
    deleteSetting,
    bulkUpdateSettings,
    getSettingsByGroup
} from '../controllers/settingsController.js';

const router = Router();

router.get('/', getAllSettings);
router.get('/:id', getSettingById);
router.post('/', createSetting);
router.put('/:id', updateSetting);
router.delete('/:id', deleteSetting);

// Bulk update settings
router.post('/bulk-update', bulkUpdateSettings);

// Get settings by group
router.get('/group/:group', getSettingsByGroup);

export default router;
