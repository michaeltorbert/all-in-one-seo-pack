<?php
namespace AIOSEO\Plugin\Common\Main\Migrations\Definitions;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use AIOSEO\Plugin\Common\Main\Migrations\Migration;

/**
 * Unschedules the retired daily AI credit fetch action.
 *
 * Credits are fetched on demand now (the REST `ai/credits` route when the AI UI
 * loads, plus after every generation), so the recurring `aioseo_ai_update_credits`
 * action and any queued failure-path retries are removed from Action Scheduler.
 *
 * @since 5.0.1
 */
class UnscheduleAiCreditFetch implements Migration {
	/**
	 * The retired action name.
	 *
	 * @since 5.0.1
	 *
	 * @var string
	 */
	private $actionName = 'aioseo_ai_update_credits';

	/**
	 * {@inheritdoc}
	 *
	 * @since 5.0.1
	 */
	public function name() {
		return 'unschedule_ai_credit_fetch';
	}

	/**
	 * {@inheritdoc}
	 *
	 * @since 5.0.1
	 */
	public function version() {
		return '5.0.1';
	}

	/**
	 * {@inheritdoc}
	 *
	 * NOTE: Action Scheduler is not booted yet during preLoad(), where the runner executes, and
	 * its procedural API warns when called that early — so the work waits for
	 * `action_scheduler_init`.
	 *
	 * @since 5.0.1
	 */
	public function up() {
		if ( did_action( 'action_scheduler_init' ) ) {
			$this->unschedule();

			return;
		}

		add_action( 'action_scheduler_init', [ $this, 'unschedule' ] );
	}

	/**
	 * Removes the retired action from the queue. Public because it doubles as the deferred callback.
	 *
	 * @since 5.0.1
	 *
	 * @return void
	 */
	public function unschedule() {
		if ( empty( aioseo()->actionScheduler ) ) {
			return;
		}

		aioseo()->actionScheduler->unschedule( $this->actionName );
	}

	/**
	 * {@inheritdoc}
	 *
	 * NOTE: reads the queue straight from the Action Scheduler table, since the procedural API is
	 * off limits at preLoad() time. A missing table means there is no queue to clean.
	 *
	 * @since 5.0.1
	 */
	public function verify() {
		$db        = aioseo()->core->db->db;
		$tableName = $db->prefix . 'actionscheduler_actions';

		$tableExists = $db->get_var(
			$db->prepare(
				'SELECT TABLE_NAME
				FROM INFORMATION_SCHEMA.TABLES
				WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = %s',
				$tableName
			)
		);

		if ( empty( $tableExists ) ) {
			return true;
		}

		$pending = $db->get_var(
			$db->prepare(
				"SELECT COUNT(*)
				FROM {$tableName}
				WHERE hook = %s
				AND status IN ('pending', 'in-progress')",
				$this->actionName
			)
		);

		return empty( $pending );
	}
}