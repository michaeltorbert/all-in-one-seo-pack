<template>
	<div class="aioseo-app">
		<div
			class="aioseo-details-column"
			:class="{
				editing: showEditTitle || showEditDescription
			}"
		>
			<div
				v-if="showScore && allowed('aioseo_page_analysis')"
				class="edit-row scores"
			>
				<core-tooltip>
					<div class="aioseo-details-column__truseo">
						<div
							v-if="truSeoScanning"
							class="aioseo-details-column__loading"
						>
							<core-loader dark />
						</div>

						<core-score-button
							v-else
							:score="score"
						>
							<template #icon>
								<svg-aioseo-logo-gear />
							</template>
						</core-score-button>
					</div>

					<template #tooltip>
						{{ strings.seoScoreTooltipTerm }}
					</template>
				</core-tooltip>
			</div>

			<details-field
				v-if="showTitle"
				v-model="title"
				:parsed="titleParsed"
				:label="strings.seoTitle"
				:is-custom="isCustomTitle"
				:editing="showEditTitle"
				:loading="isFieldLoading('title')"
				single
				:length="showLengthBadges ? titleLength : null"
				:tags-context="getTagText('taxonomy', term?.taxonomy, 'Title')"
				:default-tags="[ 'taxonomy_title' ]"
				:custom-tooltip="strings.customTitle"
				:default-tooltip="strings.defaultTitle"
				@edit="editTitle"
				@save="save('title')"
				@cancel="cancel('title')"
			/>

			<details-field
				v-if="showDescription"
				v-model="termDescription"
				:parsed="descriptionParsed"
				:label="strings.metaDescription"
				:is-custom="isCustomDescription"
				:editing="showEditDescription"
				:loading="isFieldLoading('description')"
				:length="showLengthBadges ? descriptionLength : null"
				:tags-context="getTagText('taxonomy', term?.taxonomy, 'Description')"
				:default-tags="[ 'taxonomy_description' ]"
				:custom-tooltip="strings.customDescription"
				:default-tooltip="strings.defaultDescription"
				@edit="editDescription"
				@save="save('description')"
				@cancel="cancel('description')"
			/>
		</div>
	</div>
</template>

<script>
import links from '@/vue/utils/links'
import http from '@/vue/utils/http'
import { merge } from 'lodash-es'
import tags from '@/vue/utils/tags'

import { allowed } from '@/vue/utils/AIOSEO_VERSION'

import { useTruSeoScore } from '@/vue/composables/TruSeoScore'

import { MIN_WIDTH_FOR_BADGES, useDetailsFieldLength } from '@/vue/composables/DetailsFieldLength'

import CoreLoader from '@/vue/components/common/core/Loader'
import CoreScoreButton from '@/vue/components/common/core/ScoreButton'
import CoreTooltip from '@/vue/components/common/core/Tooltip'
import DetailsField from '@/vue/components/common/core/DetailsField'
import SvgAioseoLogoGear from '@/vue/components/common/svg/aioseo/LogoGear'
import '@/vue/assets/scss/main.scss'

import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN

export default {
	setup () {
		const { strings }                              = useTruSeoScore()
		const { getTitleLength, getDescriptionLength } = useDetailsFieldLength()

		return {
			allowed,
			composableStrings : strings,
			getTagText        : tags.getTagText,
			getTitleLength,
			getDescriptionLength
		}
	},
	components : {
		CoreLoader,
		CoreScoreButton,
		CoreTooltip,
		DetailsField,
		SvgAioseoLogoGear
	},
	props : {
		term  : Object,
		terms : Array,
		index : Number
	},
	data () {
		return {
			termId              : null,
			columnName          : null,
			title               : null,
			titleParsed         : null,
			termDescription     : null,
			descriptionParsed   : null,
			showEditTitle       : false,
			showEditDescription : false,
			loadingField        : null,
			showTitle           : true,
			showDescription     : true,
			columnWidth         : 0,
			resizeObserver      : null,
			scoreValue          : 0,
			hasScore            : false,
			truSeoScanning      : false,
			strings             : merge(this.composableStrings, {
				seoTitle           : __('SEO Title', td),
				metaDescription    : __('Meta Description', td),
				customTitle        : __('Custom SEO title written for this term', td),
				defaultTitle       : __('Default SEO title generated from your template', td),
				customDescription  : __('Custom meta description written for this term', td),
				defaultDescription : __('Default meta description generated from your template', td)
			})
		}
	},
	computed : {
		// Custom means "differs from the taxonomy template", not "has a value". The editors
		// open pre-filled with that template, so presence alone marks untouched fields custom.
		isCustomTitle () {
			return !!this.term.title && this.term.title !== this.term.defaultTitle
		},
		isCustomDescription () {
			return !!this.term.description && this.term.description !== this.term.defaultDescription
		},
		titleLength () {
			return this.getTitleLength(this.titleParsed)
		},
		descriptionLength () {
			return this.getDescriptionLength(this.descriptionParsed)
		},
		showLengthBadges () {
			return !this.columnWidth || this.columnWidth >= MIN_WIDTH_FOR_BADGES
		},
		// Set per term in PHP — only TruSEO-eligible taxonomies get a score. Held locally so a row
		// created after page load (Add New Term) can turn the badge on once its data arrives.
		showScore () {
			return this.hasScore
		},
		score () {
			return this.scoreValue
		}
	},
	methods : {
		// An editor left at the template means "keep using the default", which is stored empty.
		storedValue (value, template) {
			return value === template ? '' : value
		},
		isFieldLoading (field) {
			return field === this.loadingField || 'both' === this.loadingField
		},
		// `showScore` only arrives for TruSEO-eligible taxonomies, so an absent key means "leave the
		// badge as it is" rather than "hide it".
		applyScore (data) {
			if (undefined !== data?.showScore) {
				this.hasScore        = !!data.showScore
				this.term.showScore  = data.showScore
			}

			if (undefined !== data?.value) {
				this.scoreValue = data.value || 0
				this.term.value = this.scoreValue
			}
		},
		updateScanningState (isScanning) {
			this.truSeoScanning = isScanning
		},
		updateScore (score) {
			this.scoreValue = score
			this.term.value = score
			this.hasScore   = true
		},
		refreshParsedValues () {
			this.loadingField = 'both'

			http.post(links.restUrl('terms-list/load-details-column'))
				.send({ ids: [ this.term.id ] })
				.then(response => {
					const fresh = response.body?.terms?.find(t => t.id === this.term.id)
					if (!fresh) {
						return
					}

					this.titleParsed            = fresh.titleParsed
					this.descriptionParsed      = fresh.descriptionParsed
					this.term.titleParsed       = fresh.titleParsed
					this.term.descriptionParsed = fresh.descriptionParsed

					this.applyScore(fresh)
				})
				.catch(error => {
					console.error(`Unable to refresh term ${this.term.id}: ${error}`)
				})
				.finally(() => {
					this.loadingField = null
				})
		},
		save (field) {
			if (!allowed('aioseo_page_general_settings')) {
				return
			}

			// Commit only the field being saved so an open editor for the other field keeps its
			// saved baseline (used by cancel() to revert) and isn't persisted with unsaved changes.
			// An editor left at the template is stored empty so the field keeps following the
			// taxonomy template if the default changes.
			if ('title' === field) {
				this.term.title    = this.storedValue(this.title, this.term.defaultTitle)
				this.showEditTitle = false
			}

			if ('description' === field) {
				this.term.description    = this.storedValue(this.termDescription, this.term.defaultDescription)
				this.showEditDescription = false
			}

			this.loadingField = field

			http.post(links.restUrl('terms-list/update-details-column'))
				.send({
					termId      : this.term.id,
					title       : this.term.title,
					description : this.term.description
				})
				.then(response => {
					this.titleParsed       = response.body.title
					this.descriptionParsed = response.body.description

					this.term.titleParsed       = response.body.title
					this.term.descriptionParsed = response.body.description
					this.showTitle              = response.body.showTitle
					this.showDescription        = response.body.showDescription
				})
				.catch(error => {
					console.error(`Unable to update term with ID ${this.term.id}: ${error}`)
				})
				.finally(() => {
					this.loadingField = null
				})
		},
		cancel (field) {
			// Revert the field's unsaved value to its saved baseline and close only that editor.
			if ('title' === field) {
				this.title         = this.term.title || this.term.defaultTitle
				this.showEditTitle = false
			}

			if ('description' === field) {
				this.termDescription     = this.term.description || this.term.defaultDescription
				this.showEditDescription = false
			}
		},
		editTitle () {
			this.showEditTitle = true
		},
		editDescription () {
			this.showEditDescription  = true
		}
	},
	mounted () {
		this.termId            = this.term.id
		this.columnName        = this.term.columnName
		// Fall back to the taxonomy's template so the editor opens with the smart tags to
		// tweak rather than an empty box, matching the posts column.
		this.title             = this.term.title || this.term.defaultTitle
		this.titleParsed       = this.term.titleParsed
		this.termDescription   = this.term.description || this.term.defaultDescription
		this.descriptionParsed = this.term.descriptionParsed
		this.showTitle         = this.term.showTitle
		this.showDescription   = this.term.showDescription

		this.applyScore(this.term)

		// If the term data changed, we need to parse the title and description again.
		// This can happen after using the quick-edit feature.
		// Re-read the parsed values rather than re-saving: save() would post the editor's
		// values, which fall back to the taxonomy template.
		if (this.term.reload) {
			this.refreshParsedValues()
		}

		// Watch the cell so the length counters drop out when the column narrows, matching
		// the posts column.
		if (window.ResizeObserver) {
			this.resizeObserver = new window.ResizeObserver(entries => {
				entries.forEach(entry => {
					this.columnWidth = Math.round(entry.contentRect.width)
				})
			})

			this.resizeObserver.observe(this.$el.parentNode || this.$el)
		}

		window.aioseoBus.$on('batchScanLoading' + this.termId, this.updateScanningState)
		window.aioseoBus.$on('batchScanScoreUpdate' + this.termId, this.updateScore)
	},
	beforeUnmount () {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect()
		}

		window.aioseoBus.$off('batchScanLoading' + this.termId, this.updateScanningState)
		window.aioseoBus.$off('batchScanScoreUpdate' + this.termId, this.updateScore)
	}
}
</script>

<style lang="scss">
.aioseo-details-column {
	float: left;
	display: block;
	opacity: 1;
	overflow: hidden;
	width: 100%;

	&.editing {
		max-height: initial;
		overflow: visible;
	}

	.dashicons {
		cursor: pointer;
	}

	.aioseo-quickedit {
		margin-right: 5px;
		color: #72777c;

		&:hover {
			color: #0073aa;
			outline: 0;
		}
	}

	.aioseo-quickedit-input {
		float:left;
		position:relative;
		margin-bottom: 10px;
		font-size:13px;
		width:100%;
		z-index:1;
	}

	.aioseo-quickedit-input-save {
		margin-right: 5px;
		color: rgb(22, 204, 22);
	}

	.aioseo-quickedit-input-cancel {
		color: red;
	}

	.aioseo-quickedit:focus,
	.aioseo-quickedit-input-save:focus,
	.aioseo-quickedit-input-cancel:focus  {
		box-shadow: none;
	}

	.aioseo-quickedit-spinner {
		float:left;
		width:20px;
		margin-right:5px;
	}

	.edit-row {
		margin-bottom: 10px;
		&.edit-title,
		&.edit-description,
		&.edit-image-title,
		&.edit-image-alt {
			max-height: 70px;
			overflow: hidden;
		}
	}
}

table.wp-list-table {
	&.tags {
		.aioseo-html-tags-editor {
			.add-tags {
				flex-direction: column;
				align-items: start;
			}
		}
	}
}

td.seotitle.column-seotitle,
td.seodesc.column-seodesc,
td.seokeywords.column-seokeywords {
	overflow: visible;
}

@media screen and (max-width: 782px) {
	body.wp-admin {
		th.column-seotitle,
		th.column-seodesc,
		th.column-seokeywords,
		td.seotitle.column-seotitle,
		td.seodesc.column-seodesc,
		td.seokeywords.column-seokeywords {
			display: none;
		}
	}
}
</style>