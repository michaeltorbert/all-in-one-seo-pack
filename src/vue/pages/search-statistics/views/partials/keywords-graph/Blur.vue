<template>
	<core-blur>
		<keywords-graph legend-style="simple" />
	</core-blur>
</template>

<script>
import CoreBlur from '@/vue/components/common/core/Blur'
import KeywordsGraph from './KeywordsGraph'
export default {
	components : {
		CoreBlur,
		KeywordsGraph
	}
}
</script>