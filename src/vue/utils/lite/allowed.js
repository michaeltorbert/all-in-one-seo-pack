import {
	useRootStore
} from '@/vue/stores'

// An array of permissions is OR semantics — allowed if the user has any one of
// them (mirrors the REST `access` arrays on the PHP side).
export const allowed = function (permission) {
	const rootStore = useRootStore()
	const user      = rootStore.aioseo.user

	if (user.canManage) {
		return true
	}

	const permissions = Array.isArray(permission) ? permission : [ permission ]

	return permissions.some(perm => !!(user.capabilities && user.capabilities[perm]))
}