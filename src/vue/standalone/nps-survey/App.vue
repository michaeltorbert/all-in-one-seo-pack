<template>
	<transition
		name="nps-slide-up"
		appear
	>
		<div
			v-if="visible"
			class="aioseo-nps-survey"
		>
			<button
				class="aioseo-nps-survey__close"
				@click="onDismiss"
				:aria-label="strings.close"
			>
				&#x2715;
			</button>

			<!-- Step 1: Score -->
			<div
				v-if="1 === step"
				class="aioseo-nps-survey__step"
			>
				<div class="aioseo-nps-survey__header">
					{{ strings.heading }}
				</div>

				<p class="aioseo-nps-survey__question">
					{{ strings.question }}
				</p>

				<div class="aioseo-nps-survey__scores">
					<button
						v-for="n in scores"
						:key="n"
						class="aioseo-nps-survey__score-btn"
						:class="{ selected: n === score }"
						@click="selectScore(n)"
					>
						{{ n }}
					</button>
				</div>

				<div class="aioseo-nps-survey__labels">
					<span>{{ strings.notLikely }}</span>
					<span>{{ strings.veryLikely }}</span>
				</div>
			</div>

			<!-- Step 2: Feedback -->
			<div
				v-if="2 === step"
				class="aioseo-nps-survey__step"
			>
				<button
					class="aioseo-nps-survey__back"
					@click="goBack"
				>
					&#8592; {{ strings.back }}
				</button>

				<div class="aioseo-nps-survey__header">
					{{ feedbackHeading }}
				</div>

				<textarea
					v-model="feedback"
					class="aioseo-nps-survey__textarea"
					:placeholder="strings.feedbackPlaceholder"
					rows="4"
				/>

				<base-button
					type="blue"
					:loading="submitting"
					@click="onSubmit"
				>
					{{ strings.submitButton }}
				</base-button>
			</div>

			<!-- Step 3: Thank you, routed to support or a review ask by score -->
			<div
				v-if="3 === step"
				class="aioseo-nps-survey__step"
				:class="{ 'aioseo-nps-survey__step--thankyou': 'passive' === bucket }"
			>
				<template v-if="'detractor' === bucket">
					<div class="aioseo-nps-survey__header">
						{{ strings.supportHeading }}
					</div>

					<p class="aioseo-nps-survey__body">
						{{ strings.supportBody }}
					</p>

					<base-button
						tag="a"
						type="blue"
						:href="supportUrl"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ strings.supportButton }}
					</base-button>

					<p class="aioseo-nps-survey__hint">
						{{ strings.supportHint }}
					</p>
				</template>

				<template v-else-if="'promoter' === bucket">
					<div class="aioseo-nps-survey__header">
						{{ strings.reviewHeading }}
					</div>

					<p class="aioseo-nps-survey__body">
						{{ strings.reviewBody }}
					</p>

					<div class="aioseo-nps-survey__actions">
						<base-button
							tag="a"
							type="blue"
							:href="reviewUrl"
							target="_blank"
							rel="noopener noreferrer"
							@click="onReviewClick"
						>
							{{ strings.reviewButton }}
						</base-button>

						<button
							class="aioseo-nps-survey__decline"
							@click="onDismiss"
						>
							{{ strings.reviewDecline }}
						</button>
					</div>

					<p class="aioseo-nps-survey__hint">
						{{ strings.reviewHint }}
					</p>
				</template>

				<p
					v-else
					class="aioseo-nps-survey__thankyou"
				>
					{{ strings.thankYou }}
				</p>
			</div>
		</div>
	</transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import http from '@/vue/utils/http'
import { __ } from '@/vue/plugins/translations'

const td = import.meta.env.VITE_TEXTDOMAIN_PRO

const supportUrl = 'https://aioseo.com/contact'
const reviewUrl  = 'https://aioseo.com/aioseo-wordpress-rating'

const scores = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]

const strings = {
	heading                 : __('Feedback', td),
	question                : __('How likely are you to recommend AIOSEO to a friend or colleague?', td),
	notLikely               : __('Not at all likely', td),
	veryLikely              : __('Extremely likely', td),
	feedbackHeading         : __('What could we do to improve?', td),
	feedbackHeadingPromoter : __('What do you love most about AIOSEO?', td),
	feedbackPlaceholder     : __('Your feedback...', td),
	submitButton            : __('Submit feedback', td),
	thankYou                : __('Thank you for your feedback!', td),
	back                    : __('Back', td),
	close                   : __('Close', td),
	supportHeading          : __('Thanks — we\'d like to fix this', td),
	supportBody             : __('If something isn\'t working, our support team can help.', td),
	supportButton           : __('Contact support', td),
	supportHint             : __('Opens aioseo.com/contact in a new tab', td),
	reviewHeading           : __('Glad to hear it', td),
	reviewBody              : __('Would you share that on WordPress.org? Reviews are how most site owners find AIOSEO in the first place.', td),
	reviewButton            : __('Leave a review', td),
	reviewDecline           : __('No thanks', td),
	reviewHint              : __('Opens WordPress.org in a new tab', td)
}

const visible   = ref(true)
const step      = ref(1)
const score     = ref(null)
const feedback  = ref('')
const submitting = ref(false)
const submitted  = ref(false)

const bucket = computed(() => {
	if (9 <= score.value) {
		return 'promoter'
	}

	return 7 <= score.value ? 'passive' : 'detractor'
})

// Promoters get a positive prompt; passives and detractors get an improvement prompt.
const feedbackHeading = computed(() => 'promoter' === bucket.value ? strings.feedbackHeadingPromoter : strings.feedbackHeading)

const selectScore = (n) => {
	score.value = n
	step.value  = 2
}

const goBack = () => {
	step.value = 1
}

const onDismiss = async () => {
	visible.value = false

	// Once submitted, the submission snooze is already set — closing must not overwrite it with the shorter dismiss snooze.
	if (submitted.value) {
		return
	}

	try {
		await http.post('/nps-survey/dismiss')
	} catch (e) {
		// Non-critical — ignore errors.
	}
}

const onSubmit = async () => {
	submitting.value = true
	try {
		await http.post('/nps-survey/submit').send({
			score    : score.value,
			feedback : feedback.value
		})
		submitted.value = true
	} catch (e) {
		// Non-critical — ignore errors.
	} finally {
		submitting.value = false
	}

	step.value = 3

	// The support and review variants carry a CTA, so they wait to be dismissed.
	if ('passive' === bucket.value) {
		setTimeout(() => {
			visible.value = false
		}, 3000)
	}
}

const onReviewClick = async () => {
	try {
		await http.post('/nps-survey/review-click')
	} catch (e) {
		// Non-critical — ignore errors.
	}
}

const onKeydown = (e) => {
	if ('Escape' === e.key && visible.value) {
		onDismiss()
	}
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style lang="scss">
.aioseo-nps-survey {
	position: fixed;
	bottom: 40px;
	right: 40px;
	width: 548px;
	max-width: calc(100vw - 32px);
	box-sizing: border-box;
	z-index: 9999;

	background: $white;
	border-radius: 4px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	padding: 24px;
	box-sizing: border-box;

	&__close {
		position: absolute;
		top: 12px;
		right: 12px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 16px;
		color: $gray3;
		line-height: 1;
		padding: 4px;

		&:hover {
			color: $font-color;
		}
	}

	&__back {
		display: inline-flex;
		align-items: center;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 13px;
		color: $gray3;
		padding: 0;
		margin-bottom: 12px;

		&:hover {
			color: $blue;
		}
	}

	&__header {
		font-size: 16px;
		font-weight: 700;
		color: $black3;
		margin-bottom: 12px;
	}

	&__question {
		font-size: 14px;
		color: $font-color;
		margin-bottom: 16px;
	}

	&__scores {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
	}

	&__score-btn {
		flex: 1;
		height: 36px;
		border: 1px solid $input-border;
		border-radius: 4px;
		background: $white;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
		color: $font-color;
		transition: background 0.15s, border-color 0.15s, color 0.15s;

		&:hover,
		&.selected {
			background: $blue;
			border-color: $blue;
			color: $white;
		}
	}

	&__labels {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: $gray3;
		margin-bottom: 0;
	}

	&__textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid $input-border;
		border-radius: 4px;
		padding: 10px 12px;
		font-size: 14px;
		resize: vertical;
		margin-bottom: 16px;
		font-family: inherit;

		&:focus {
			outline: none;
			border-color: $blue;
		}
	}

	&__body {
		font-size: 14px;
		color: $font-color;
		margin: 0 0 16px;
	}

	&__actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	&__decline {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 13px;
		color: $gray3;
		padding: 9px 4px;

		&:hover {
			color: $blue;
		}
	}

	&__hint {
		font-size: 12px;
		color: $gray3;
		margin: 10px 0 0;
	}

	&__step--thankyou {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60px;
	}

	&__thankyou {
		font-size: 15px;
		font-weight: 600;
		color: $black3;
		text-align: center;
		margin: 0;
	}

	@media (max-width: 600px) {
		left: 16px;
		right: 16px;
		bottom: 16px;
		width: auto;
		max-width: none;
		padding: 16px;

		// Eleven buttons on a narrow screen leave roughly 25px each, so the gap and
		// horizontal padding give back what little they can.
		&__scores {
			gap: 3px;
		}

		&__score-btn {
			height: 32px;
			font-size: 12px;
			padding: 0 2px;
		}
	}
}

.nps-slide-up-enter-active,
.nps-slide-up-leave-active {
	transition: opacity 0.3s ease, transform 0.3s ease;
}

.nps-slide-up-enter-from,
.nps-slide-up-leave-to {
	opacity: 0;
	transform: translateY(20px);
}
</style>