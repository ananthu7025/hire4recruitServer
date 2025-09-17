import express from 'express';
import { RoleController } from '../controllers/roleController';
import { ValidationMiddleware } from '../middleware/validation';
import { createRoleSchema, updateRoleSchema } from '../validators/role';
import { AuthMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all role routes
router.use(AuthMiddleware.authenticate);

/**
 * @route   GET /api/roles
 * @desc    Get all roles for the company
 * @access  Private
 */
router.get('/', RoleController.getRoles);

/**
 * @route   GET /api/roles/:roleId
 * @desc    Get role by ID
 * @access  Private
 */
router.get('/:roleId', RoleController.getRoleById);

/**
 * @route   POST /api/roles
 * @desc    Create custom role
 * @access  Private (Admin/HR Manager)
 */
router.post('/', ValidationMiddleware.validate(createRoleSchema), RoleController.createRole);

/**
 * @route   PUT /api/roles/:roleId
 * @desc    Update role
 * @access  Private (Admin/HR Manager)
 */
router.put('/:roleId', ValidationMiddleware.validate(updateRoleSchema), RoleController.updateRole);

/**
 * @route   DELETE /api/roles/:roleId
 * @desc    Delete role
 * @access  Private (Admin only)
 */
router.delete('/:roleId', RoleController.deleteRole);

export default router;