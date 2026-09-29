<template>
	<div class="aioseo-tab-content aioseo-seo-revisions">
		<core-card
			slug="postSettingsSeoRevisions"
			:noSlide="true"
			:hideHeader="true"
		>
			<core-blur>
				<seo-revisions-list/>
			</core-blur>

			<seo-revisions-upsell :parent-component-context="parentComponentContext"/>
		</core-card>
	</div>
</template>

<script>
import CoreBlur from '@/vue/components/common/core/Blur'
import SeoRevisionsList from '../partials-seo-revisions/List'
import SeoRevisionsUpsell from '@/vue/components/common/seo-revisions/Upsell'
import CoreCard from '@/vue/components/common/core/Card'

export default {
	components : {
		CoreBlur,
		SeoRevisionsList,
		SeoRevisionsUpsell,
		CoreCard
	},
	props : {
		parentComponentContext : String
	}
}
</script>