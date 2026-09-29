<template>
	<core-card
		class="aioseo-link-assistant-statistics"
		slug="internalLinksOverviewCounter"
		:toggles="false"
		no-slide
		hide-header
	>
		<grid-row>
			<grid-column
				class="counter divider-right"
				oneFifth
			>
				<LinkCount
					type='posts'
					:count="totals.crawledPosts"
				/>
			</grid-column>

			<grid-column
				class="counter divider-right"
				oneFifth
			>
				<LinkCount
					type='orphaned'
					:count="totals.orphanedPosts"
				/>
			</grid-column>

			<grid-column
				class="counter divider-right"
				oneFifth
			>
				<LinkCount
					type='external'
					:count="totals.externalLinks"
				/>
			</grid-column>

			<grid-column
				class="counter divider-right"
				oneFifth
			>
				<LinkCount
					type='internal'
					:count="totals.internalLinks"
				/>
			</grid-column>

			<grid-column
				class="counter"
				oneFifth
			>
				<LinkCount
					type='affiliate'
					:count="totals.affiliateLinks"
				/>
			</grid-column>
		</grid-row>
	</core-card>
</template>

<script>
import CoreCard from '@/vue/components/common/core/Card'
import GridColumn from '@/vue/components/common/grid/Column'
import GridRow from '@/vue/components/common/grid/Row'
import LinkCount from './LinkCount'
export default {
	components : {
		CoreCard,
		GridColumn,
		GridRow,
		LinkCount
	},
	props : {
		totals : {
			type     : Object,
			required : true
		}
	}
}
</script>

<style lang="scss">
.aioseo-app .aioseo-link-assistant-statistics {
	--aioseo-gutter: 0px;

	margin: 0;

	.counter {
		display: flex;
		justify-content: center;
		flex: 1;
	}

	.divider-right {
		border-right: 2px solid $gray;
	}

	@media screen and (max-width: 912px) {

		.aioseo-row {
			justify-content: center;
			row-gap: 16px;

			.counter {
				display: inline-flex;

				&.aioseo-col {
					flex-basis: auto;
				}
			}
		}
	}

	@media screen and (max-width: 340px) {

		.aioseo-row {
			justify-content: flex-start !important;
			margin: 0 auto
		}

		.divider-right {
			border-right: 0;
		}

		.aioseo-tooltip {
			display: none !important;
		}
	}
}
</style>