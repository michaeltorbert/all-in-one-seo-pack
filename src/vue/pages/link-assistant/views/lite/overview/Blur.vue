<template>
	<core-blur>
		<grid-row
			v-if="showTotals"
			class="overview-link-count"
		>
			<grid-column>
				<link-counts
					:totals="totals"
				/>
			</grid-column>
		</grid-row>
		<grid-row>
			<grid-column
				md="6"
			>
				<link-ratio
					:totals="totals"
				/>
				<linking-opportunities
					:linking-opportunities="linkingOpportunities"
				/>
			</grid-column>

			<grid-column
				md="6"
			>
				<most-linked-domains
					:totals="totals"
					:most-linked-domains="mostLinkedDomains"
				/>
			</grid-column>
		</grid-row>
	</core-blur>
</template>

<script>
import CoreBlur from '@/vue/components/common/core/Blur'
import GridColumn from '@/vue/components/common/grid/Column'
import GridRow from '@/vue/components/common/grid/Row'
import LinkCounts from '../../partials/overview/LinkCounts'
import LinkRatio from '../../partials/overview/LinkRatio'
import LinkingOpportunities from '../../partials/overview/LinkingOpportunities'
import MostLinkedDomains from '../../partials/overview/MostLinkedDomains'
export default {
	components : {
		CoreBlur,
		GridColumn,
		GridRow,
		LinkCounts,
		LinkRatio,
		LinkingOpportunities,
		MostLinkedDomains
	},
	props : {
		showTotals : {
			type : Boolean,
			default () {
				return true
			}
		}
	},
	computed : {
		totals () {
			return {
				crawledPosts   : 102,
				externalLinks  : 753,
				internalLinks  : 56,
				affiliateLinks : 175,
				orphanedPosts  : 78,
				totalLinks     : 753 + 56 + 175
			}
		},
		linkingOpportunities () {
			return [
				{ postTitle: 'Test Post Title 1', postId: '123', suggestionsInbound: '2', suggestionsOutbound: '13' },
				{ postTitle: 'Test Post Title 2', postId: '124', suggestionsInbound: '2', suggestionsOutbound: '13' },
				{ postTitle: 'Test Post Title 3', postId: '125', suggestionsInbound: '2', suggestionsOutbound: '13' },
				{ postTitle: 'Test Post Title 4', postId: '126', suggestionsInbound: '2', suggestionsOutbound: '13' },
				{ postTitle: 'Test Post Title 5', postId: '127', suggestionsInbound: '2', suggestionsOutbound: '13' }
			]
		},
		mostLinkedDomains () {
			return [
				{ name: 'aioseo.com', count: 100 },
				{ name: 'wpbeginner.com', count: 99 },
				{ name: 'wpforms.com', count: 50 },
				{ name: 'optinmonster.com', count: 40 },
				{ name: 'monsterinsights.com', count: 30 },
				{ name: 'smashballoon.com', count: 20 },
				{ name: 'exactmetrics.com', count: 10 },
				{ name: 'seedprod.com', count: 5 },
				{ name: 'awesomemotive.com', count: 4 },
				{ name: 'easydigitaldownloads.com', count: 3 }
			]
		}
	}
}
</script>