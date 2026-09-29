<?php
namespace AIOSEO\Plugin\Common\Admin\Notices;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Review Plugin Notice.
 *
 * @since 4.0.0
 */
class Review {
	/**
	 * The user meta key holding the review prompt's dismissal state.
	 *
	 * @since 5.0.2
	 *
	 * @var string
	 */
	const DISMISSED_META_KEY = '_aioseo_plugin_review_dismissed';

	/**
	 * Dismissal state recorded when the user acted on the prompt; silences every review prompt.
	 *
	 * @since 5.0.2
	 *
	 * @var string
	 */
	const DISMISSED_OPTED_OUT = '3';

	/**
	 * Dismissal state recorded when the user only closed the prompt.
	 *
	 * NOTE: Unlike {@see self::DISMISSED_OPTED_OUT}, this leaves the notification center's review
	 * follow-up available. {@see \AIOSEO\Plugin\Common\Models\Notification::getStaticNotifications()}
	 *
	 * @since 5.0.2
	 *
	 * @var string
	 */
	const DISMISSED_CLOSED = '4';

	/**
	 * The user meta key holding the notification center follow-up's dismissal state.
	 *
	 * NOTE: Separate from {@see self::DISMISSED_META_KEY} so the follow-up can be dismissed on its
	 * own, but it stores the same states.
	 *
	 * @since 5.0.2
	 *
	 * @var string
	 */
	const NOTIFICATION_DISMISSED_META_KEY = '_aioseo_notification_plugin_review_dismissed';

	/**
	 * The URL of the plugin's review form.
	 *
	 * @since 5.0.2
	 *
	 * @var string
	 */
	const RATING_URL = 'https://aioseo.com/aioseo-wordpress-rating';

	/**
	 * Class Constructor.
	 *
	 * @since 4.0.0
	 */
	public function __construct() {
		add_action( 'wp_ajax_aioseo-dismiss-review-plugin-cta', [ $this, 'dismissNotice' ] );
	}

	/**
	 * Determines whether the current user has dismissed or snoozed the review prompt.
	 *
	 * @since 5.0.2
	 *
	 * @return bool Whether the review prompt is dismissed.
	 */
	public static function isDismissed() {
		$dismissed = get_user_meta( get_current_user_id(), self::DISMISSED_META_KEY, true );
		if ( self::DISMISSED_OPTED_OUT === $dismissed || self::DISMISSED_CLOSED === $dismissed ) {
			return true;
		}

		return ! empty( $dismissed ) && $dismissed > time();
	}

	/**
	 * Determines whether the current user can be asked to review the plugin.
	 *
	 * @since 5.0.2
	 *
	 * @return bool Whether the user can be prompted.
	 */
	public static function canPromptUser() {
		// Only ask users that interact with our plugin.
		return current_user_can( 'publish_posts' ) && ! self::isDismissed();
	}

	/**
	 * Snoozes a review prompt for the current user.
	 *
	 * @since 5.0.2
	 *
	 * @param  string $metaKey The user meta key holding the prompt's dismissal state.
	 * @return void
	 */
	public static function snooze( $metaKey = self::DISMISSED_META_KEY ) {
		update_user_meta( get_current_user_id(), $metaKey, strtotime( '+1 week' ) );
	}

	/**
	 * Go through all the checks to see if we should show the notice.
	 *
	 * @since 4.0.0
	 *
	 * @return void
	 */
	public function maybeShowNotice() {
		if ( ! self::canPromptUser() ) {
			return;
		}

		// Only show if plugin has been active for over 10 days.
		if ( ! aioseo()->internalOptions->internal->firstActivated ) {
			aioseo()->internalOptions->internal->firstActivated = time();
		}

		$activated = aioseo()->internalOptions->internal->firstActivated( time() );
		if ( $activated > strtotime( '-10 days' ) ) {
			return;
		}

		if ( get_option( 'aioseop_options' ) || get_option( 'aioseo_options_v3' ) ) {
			$this->showNotice();
		} else {
			$this->showNotice2();
		}

		// Print the script to the footer.
		add_action( 'admin_footer', [ $this, 'printScript' ] );
	}

	/**
	 * Actually show the review plugin.
	 *
	 * @since 4.0.0
	 *
	 * @return void
	 */
	public function showNotice() {
		$feedbackUrl = add_query_arg(
			[
				'wpf7528_24'   => untrailingslashit( home_url() ),
				'wpf7528_26'   => aioseo()->sensitiveOptions->hasValue( 'licenseKey' )
					? aioseo()->sensitiveOptions->get( 'licenseKey' )
					: '',
				'wpf7528_27'   => aioseo()->pro ? 'pro' : 'lite',
				'wpf7528_28'   => AIOSEO_VERSION,
				'utm_source'   => aioseo()->pro ? 'proplugin' : 'liteplugin',
				'utm_medium'   => 'review-notice',
				'utm_campaign' => 'feedback',
				'utm_content'  => AIOSEO_VERSION,
			],
			'https://aioseo.com/plugin-feedback/'
		);

		$string1 = sprintf(
			// Translators: 1 - The plugin short name ("AIOSEO").
			__( 'Are you enjoying %1$s?', 'all-in-one-seo-pack' ),
			AIOSEO_PLUGIN_NAME
		);
		$string2  = __( 'Yes I love it', 'all-in-one-seo-pack' );
		$string3  = __( 'Not Really...', 'all-in-one-seo-pack' );
		$string4  = sprintf(
					// Translators: 1 - The plugin name ("All in One SEO").
			__( 'We\'re sorry to hear you aren\'t enjoying %1$s. We would love a chance to improve. Could you take a minute and let us know what we can do better?', 'all-in-one-seo-pack' ),
			AIOSEO_PLUGIN_NAME
		); // phpcs:ignore Generic.Files.LineLength.MaxExceeded
		$string5  = __( 'Give feedback', 'all-in-one-seo-pack' );
		$string6  = __( 'No thanks', 'all-in-one-seo-pack' );
		$string7  = __( 'That\'s awesome! Could you please do us a BIG favor and give it a 5-star rating on WordPress to help us spread the word and boost our motivation?', 'all-in-one-seo-pack' );
		// Translators: 1 - The plugin name ("All in One SEO").
		$string9  = __( 'Ok, you deserve it', 'all-in-one-seo-pack' );
		$string10 = __( 'Nope, maybe later', 'all-in-one-seo-pack' );
		$string11 = __( 'I already did', 'all-in-one-seo-pack' );

		?>
		<div class="notice notice-info aioseo-review-plugin-cta is-dismissible">
			<div class="step-1">
				<p><?php echo esc_html( $string1 ); ?></p>
				<p>
					<a href="#" class="aioseo-review-switch-step-3" data-step="3"><?php echo esc_html( $string2 ); ?></a> 🙂 |
					<a href="#" class="aioseo-review-switch-step-2" data-step="2"><?php echo esc_html( $string3 ); ?></a>
				</p>
			</div>
			<div class="step-2" style="display:none;">
				<p><?php echo esc_html( $string4 ); ?></p>
				<p>
					<a href="<?php echo esc_url( $feedbackUrl ); ?>" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $string5 ); ?></a>&nbsp;&nbsp;
					<a href="#" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $string6 ); ?></a>
				</p>
			</div>
			<div class="step-3" style="display:none;">
				<p><?php echo esc_html( $string7 ); ?></p>
				<p>
					<a href="<?php echo esc_url( self::RATING_URL ); ?>" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">
						<?php echo esc_html( $string9 ); ?>
					</a>&nbsp;&bull;&nbsp;
					<a href="#" class="aioseo-dismiss-review-notice-delay" target="_blank" rel="noopener noreferrer">
						<?php echo esc_html( $string10 ); ?>
					</a>&nbsp;&bull;&nbsp;
					<a href="#" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">
						<?php echo esc_html( $string11 ); ?>
					</a>
				</p>
			</div>
		</div>
		<?php
	}

	/**
	 * Actually show the review plugin 2.0.
	 *
	 * @since 4.2.2
	 *
	 * @return void
	 */
	public function showNotice2() {
		$string1 = sprintf(
			// Translators: 1 - The plugin name ("All in One SEO").
			__( 'Hey, we noticed you have been using %1$s for some time - that’s awesome! Could you please do us a BIG favor and give it a 5-star rating on WordPress to help us spread the word and boost our motivation?', 'all-in-one-seo-pack' ), // phpcs:ignore Generic.Files.LineLength.MaxExceeded
			'<strong>' . esc_html( AIOSEO_PLUGIN_NAME ) . '</strong>'
		);

		// Translators: 1 - The plugin name ("All in One SEO").
		$string9  = __( 'Ok, you deserve it', 'all-in-one-seo-pack' );
		$string10 = __( 'Nope, maybe later', 'all-in-one-seo-pack' );
		$string11 = __( 'I already did', 'all-in-one-seo-pack' );

		?>
		<div class="notice notice-info aioseo-review-plugin-cta is-dismissible">
			<div class="step-3">
				<p><?php echo $string1; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></p>
				<p>
					<a href="<?php echo esc_url( self::RATING_URL ); ?>" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">
						<?php echo esc_html( $string9 ); ?>
					</a>&nbsp;&bull;&nbsp;
					<a href="#" class="aioseo-dismiss-review-notice-delay" target="_blank" rel="noopener noreferrer">
						<?php echo esc_html( $string10 ); ?>
					</a>&nbsp;&bull;&nbsp;
					<a href="#" class="aioseo-dismiss-review-notice" target="_blank" rel="noopener noreferrer">
						<?php echo esc_html( $string11 ); ?>
					</a>
				</p>
			</div>
		</div>
		<?php
	}

	/**
	 * Print the script for dismissing the notice.
	 *
	 * @since 4.0.13
	 *
	 * @return void
	 */
	public function printScript() {
		// Create a nonce.
		$nonce = wp_create_nonce( 'aioseo-dismiss-review' );
		?>
		<style>
			.aioseop-notice-review_plugin_cta .aioseo-action-buttons {
				display: none;
			}
			@keyframes dismissBtnVisible {
				from { opacity: 0.99; }
				to { opacity: 1; }
			}
			.aioseo-review-plugin-cta button.notice-dismiss {
				animation-duration: 0.001s;
				animation-name: dismissBtnVisible;
			}
		</style>
		<script>
			window.addEventListener('load', function () {
				var aioseoSetupButton,
					dismissBtn

				aioseoSetupButton = function (dismissBtn) {
					var notice      = document.querySelector('.notice.aioseo-review-plugin-cta'),
						delay       = false,
						relay       = true,
						stepOne     = notice.querySelector('.step-1'),
						stepTwo     = notice.querySelector('.step-2'),
						stepThree   = notice.querySelector('.step-3')

					// Add an event listener to the dismiss button.
					dismissBtn.addEventListener('click', function (event) {
						var httpRequest = new XMLHttpRequest(),
							postData    = ''

						// Build the data to send in our request.
						postData += '&delay=' + delay
						postData += '&relay=' + relay
						postData += '&action=aioseo-dismiss-review-plugin-cta'
						postData += '&nonce=<?php echo esc_html( $nonce ); ?>'

						httpRequest.open('POST', '<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>')
						httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
						httpRequest.send(postData)
					})

					notice.addEventListener('click', function (event) {
						if (event.target.matches('.aioseo-review-switch-step-3')) {
							event.preventDefault()
							stepOne.style.display   = 'none'
							stepTwo.style.display   = 'none'
							stepThree.style.display = 'block'
						}
						if (event.target.matches('.aioseo-review-switch-step-2')) {
							event.preventDefault()
							stepOne.style.display   = 'none'
							stepThree.style.display = 'none'
							stepTwo.style.display   = 'block'
						}
						if (event.target.matches('.aioseo-dismiss-review-notice-delay')) {
							event.preventDefault()
							delay = true
							relay = false
							dismissBtn.click()
						}
						if (event.target.matches('.aioseo-dismiss-review-notice')) {
							if ('#' === event.target.getAttribute('href')) {
								event.preventDefault()
							}
							relay = false
							dismissBtn.click()
						}
					})
				}

				dismissBtn = document.querySelector('.aioseo-review-plugin-cta .notice-dismiss')
				if (!dismissBtn) {
					document.addEventListener('animationstart', function (event) {
						if (event.animationName == 'dismissBtnVisible') {
							dismissBtn = document.querySelector('.aioseo-review-plugin-cta .notice-dismiss')
							if (dismissBtn) {
								aioseoSetupButton(dismissBtn)
							}
						}
					}, false)

				} else {
					aioseoSetupButton(dismissBtn)
				}
			});
		</script>
		<?php
	}

	/**
	 * Dismiss the review plugin CTA.
	 *
	 * @since 4.0.0
	 *
	 * @return string The successful response.
	 */
	public function dismissNotice() {
		// Early exit if we're not on a aioseo-dismiss-review-plugin-cta action.
		if ( ! isset( $_POST['action'] ) || 'aioseo-dismiss-review-plugin-cta' !== $_POST['action'] ) {
			return;
		}

		check_ajax_referer( 'aioseo-dismiss-review', 'nonce' );
		$delay = isset( $_POST['delay'] ) ? 'true' === sanitize_text_field( wp_unslash( $_POST['delay'] ) ) : false;
		$relay = isset( $_POST['relay'] ) ? 'true' === sanitize_text_field( wp_unslash( $_POST['relay'] ) ) : false;

		if ( ! $delay ) {
			update_user_meta( get_current_user_id(), self::DISMISSED_META_KEY, $relay ? self::DISMISSED_CLOSED : self::DISMISSED_OPTED_OUT );

			return wp_send_json_success();
		}

		self::snooze();

		return wp_send_json_success();
	}
}