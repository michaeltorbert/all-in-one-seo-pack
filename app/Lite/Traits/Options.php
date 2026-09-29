<?php
namespace AIOSEO\Plugin\Lite\Traits;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Options trait.
 *
 * @since 4.0.0
 */
trait Options {
	/**
	 * Initialize the options.
	 *
	 * @since   4.1.4
	 * @version 5.0.2 Wrap the _lite values against the merged defaults, not the Lite-only ones.
	 *
	 * @return void
	 */
	public function init() {
		parent::init();

		$dbOptions = $this->getDbOptions( $this->optionsName . '_lite' );

		// Refactor options.
		$this->defaultsMerged = array_replace_recursive( $this->defaults, $this->liteDefaults );

		// Wrap against the merged defaults, same as {@see \AIOSEO\Plugin\Pro\Traits\NetworkOptions::init()}.
		$mergedDefaults = array_replace_recursive(
			$this->liteDefaults,
			$this->addValueToValuesArray( $this->defaultsMerged, $dbOptions )
		);

		$cachedOptions = aioseo()->core->optionsCache->getOptions( $this->optionsName );
		$dbOptions     = array_replace_recursive(
			$cachedOptions,
			$mergedDefaults
		);

		aioseo()->core->optionsCache->setOptions( $this->optionsName, $dbOptions );
	}

	/**
	 * Merge defaults with liteDefaults.
	 *
	 * @since 4.1.4
	 *
	 * @return array An array of dafults.
	 */
	public function getDefaults() {
		return array_replace_recursive( parent::getDefaults(), $this->liteDefaults );
	}

	/**
	 * Updates the options in the database.
	 *
	 * @since   4.1.4
	 * @version 5.0.2 Corrected the $defaults and $optionsName parameter types.
	 *
	 * @param  string|null $optionsName An optional option name to update.
	 * @param  array|null  $defaults    The defaults to filter the options by.
	 * @param  array|null  $options     An optional options array.
	 * @return void
	 */
	public function update( $optionsName = null, $defaults = null, $options = null ) {
		$optionsName = empty( $optionsName ) ? $this->optionsName . '_lite' : $optionsName;
		$defaults    = empty( $defaults ) ? $this->liteDefaults : $defaults;

		// We're creating a new array here because it was setting it by reference.
		$cachedOptions = aioseo()->core->optionsCache->getOptions( $this->optionsName );
		$optionsBefore = json_decode( wp_json_encode( $cachedOptions ), true );

		parent::update( $this->optionsName, $options );
		parent::update( $optionsName, $defaults, $optionsBefore );
	}

	/**
	 * Updates the options in the database.
	 *
	 * @since   4.1.4
	 * @version 5.0.2 Corrected the $defaults and $optionsName parameter types.
	 *
	 * @param  boolean     $force       Whether or not to force an immediate save.
	 * @param  string|null $optionsName An optional option name to update.
	 * @param  array|null  $defaults    The defaults to filter the options by.
	 * @return void
	 */
	public function save( $force = false, $optionsName = null, $defaults = null ) {
		if ( ! $this->shouldSave && ! $force ) {
			return;
		}

		$optionsName = empty( $optionsName ) ? $this->optionsName . '_lite' : $optionsName;
		$defaults    = empty( $defaults ) ? $this->liteDefaults : $defaults;

		parent::save( $force, $this->optionsName );
		parent::save( $force, $optionsName, $defaults );
	}
}