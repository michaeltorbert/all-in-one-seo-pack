<template>
	<div>
		<template v-if="postTitle">
			<div class="aioseo-headline-analyzer-editor">
				<headline-analysis compact />
			</div>

			<!-- Main Panels/Accordions -->
			<previous-scores />
			<word-balance />
			<sentiment />
			<panel-type />
			<character-count />
			<word-count />
			<start-end-words />
		</template>

		<p v-else class="aioseo-headline-analyzer-empty-title-warning">
			{{ emptyTitleWarning }}
		</p>
	</div>
</template>

<script>
import PreviousScores from './PreviousScores'
import WordBalance from './WordBalance'
import Sentiment from './Sentiment'
import PanelType from './PanelType'
import CharacterCount from './CharacterCount'
import WordCount from './WordCount'
import StartEndWords from './StartEndWords'
import HeadlineAnalysis from '@/vue/standalone/post-settings/views/partials/general/tru-seo/HeadlineAnalysis'

import { usePostEditorStore } from '@/vue/stores'
import { decodeHtml } from '../assets/js/functions'
import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	components : {
		HeadlineAnalysis,
		PreviousScores,
		WordBalance,
		Sentiment,
		PanelType,
		CharacterCount,
		WordCount,
		StartEndWords
	},
	data () {
		return {
			emptyTitleWarning : __('Write your post title to see the analyzer data. This Headline Analyzer tool enables you to write irresistible SEO headlines that drive traffic, shares, and rank better in search results.', td),
			postEditorStore   : usePostEditorStore()
		}
	},
	computed : {
		postTitle () {
			return decodeHtml(this.postEditorStore.currentPost?.headlineAnalyzer?.headline || '')
		}
	}
}
</script>