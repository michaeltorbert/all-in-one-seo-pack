<?php
/**
 * Testing All_in_One_SEO_Pack_Sitemap::aiosp_mrt_get_url();
 *
 * @since 2.4.4.1
 *
 * @package All_in_One_SEO_Pack
 * @group url
 * @group post_permalink
 * @group All_in_One_SEO_Pack
 * @group aiosp_mrt_get_url
 */

/**
 * AIOSEOP test base
 */
require_once AIOSEOP_UNIT_TESTING_DIR . '/base/class-aioseop-test-base.php';

/**
 * Contains the test case scenario.
 *
 * Extending allows adding WP's Testing Unit; which extends to PHPUnit
 *
 * @requires PHPUnit 5.7
 *
 * @package WP_UnitTestCase
 */
class Tests_All_in_One_SEO_Pack_AiospMrtGetUrl extends AIOSEOP_Test_Base {

	/**
	 * Post IDs
	 *
	 * @since 2.4.4.1
	 * @access private
	 *
	 * @var array
	 */
	private $post_ids = array();

	/**
	 * PHPUnit Fixture - setUp()
	 *
	 * Sets up the environment to test.
	 * NOTE: Patent must be called first according to WP Handbook.
	 *
	 * @since 2.4.4.1
	 *
	 * @requires PHPUnit 5.7
	 *
	 * @link https://make.wordpress.org/core/handbook/testing/automated-testing/writing-phpunit-tests/#shared-setup-between-related-tests
	 */
	public function setUp() {
		parent::setUp();

		wp_set_current_user( 1 );

		$this->setup_posts_aiospMrtGetUrl( 3 );
	}

	/**
	 * Set up posts
	 *
	 * Set up post environment.
	 *
	 * @since 2.4.4.1
	 *
	 * @requires PHPUnit 5.7
	 *
	 * @param int $how_many
	 */
	public function setup_posts_aiospMrtGetUrl( $how_many = 0 ) {
		$args = array(
			'post_type'    => 'post',
			'post_title'   => 'title without image',
			'post_content' => 'content without image',
		);

		$ids = $this->factory->post->create_many( $how_many, $args );

		foreach ( $ids as $v1_id ) {
			$this->post_ids[] = $v1_id;
			$image            = AIOSEOP_UNIT_TESTING_DIR . '/resources/images/footer-logo.png';
			$attachment_id    = $this->factory->attachment->create_upload_object( $image, $v1_id );
			if ( 0 !== $v1_id ) {
				update_post_meta( $v1_id, '_thumbnail_id', $attachment_id );
			}
		}
	}

	/**
	 * PHPUnit Fixture - tearDown()
	 *
	 * Sets up the environment to test.
	 * NOTE: Patent must be called last according to WP Handbook.
	 *
	 * @since 2.4.4.1
	 *
	 * @link https://make.wordpress.org/core/handbook/testing/automated-testing/writing-phpunit-tests/#shared-setup-between-related-tests
	 */
	public function tearDown() {
		$this->clean();

		$this->go_to( site_url() );
		unset( $GLOBALS['wp_query'], $GLOBALS['wp_the_query'] );
		$GLOBALS['wp_the_query'] = new WP_Query();
		$GLOBALS['wp_query']     = $GLOBALS['wp_the_query'];

		parent::tearDown();
	}

	/**
	 * Test - All_in_One_SEO_Pack::aiosp_mrt_get_url()
	 *
	 * Issue #1491 Class Method to test.
	 *
	 * Function:  Gets the url associated to the post in WP_Query
	 * Expected:  On edit-post screen, false is returned.
	 * Actual:    It is throwing a PHP Error. count(): `Parameter must be an array or an object that implements Countable`
	 * Reproduce: Go to edit-post screen.
	 *
	 * @since 2.4.4.1
	 *
	 * @requires PHPUnit 5.7
	 *
	 * @ticket 1491 Warning: count(): Parameter must be an array or an object that implements Countable #1491
	 * @link https://github.com/semperfiwebdesign/all-in-one-seo-pack/issues/1355
	 *
	 * set_current_screen.
	 * @link https://developer.wordpress.org/reference/functions/set_current_screen/
	 * @link https://codex.wordpress.org/Plugin_API/Admin_Screen_Reference
	 *
	 * @group url
	 * @group post_permalink
	 * @group All_in_One_SEO_Pack
	 * @group aiosp_mrt_get_url
	 *
	 * @expectedException count(): Parameter must be an array or an object that implements Countable
	 * @expectedExceptionMessage Error Exception Message in Annotations.
	 */
	public function test_aiosp_mrt_get_url_issue1491() {
		global $aioseop_class;
		if ( ! isset( $aioseop_class ) ) {
			$aioseop_class = new All_in_One_SEO_Pack();
		}

		// On post Edit Screen. ERROR.
		set_current_screen( 'post.php?post=' . $this->post_ids[0] . '&action=edit' );
		$this->go_to( site_url() . 'post.php?post=' . $this->post_ids[0] . '&action=edit' );
		unset( $GLOBALS['wp_query'], $GLOBALS['wp_the_query'] );
		$GLOBALS['wp_the_query'] = new WP_Query();
		$GLOBALS['wp_query']     = $GLOBALS['wp_the_query'];

		global $wp_query;
		$t01 = $aioseop_class->aiosp_mrt_get_url( $wp_query, true );
		$this->assertFalse( $t01, 'All_in_One_SEO_Pack_Sitemap::aiosp_mrt_get_url() has failed. \tests\modules\general\test-All_in_One_SEO_Pack-aiospMrtGetUrl.php' );
	}

	/**
	 * Test - All_in_One_SEO_Pack::aiosp_mrt_get_url() on Post Edit
	 *
	 * @since 2.4.4.1
	 *
	 * @requires PHPUnit 5.7
	 *
	 * @ticket 1491 Warning: count(): Parameter must be an array or an object that implements Countable
	 *
	 * @see set_current_screen.
	 * @link https://developer.wordpress.org/reference/functions/set_current_screen/
	 * @link https://codex.wordpress.org/Plugin_API/Admin_Screen_Reference
	 *
	 * @see WP_UnitTestCase::go_to()
	 *
	 * @group url
	 * @group post_permalink
	 * @group All_in_One_SEO_Pack
	 * @group aiosp_mrt_get_url
	 *
	 * @expectedException count(): Parameter must be an array or an object that implements Countable
	 * @expectedExceptionMessage Error Exception Message in Annotations.
	 */
	public function test_aiosp_mrt_get_url_post_edit() {
		global $aioseop_class;
		if ( ! isset( $aioseop_class ) ) {
			unset( $aioseop_class );
			$aioseop_class = new All_in_One_SEO_Pack();
		}

		/*
		 * Unit Testcase go_to workaround.
		 *
		 * When loading an admin page, edit-post doesn't modify the query in any way. This
		 * appears to be a potentual bug with WP_UnitTestCase.
		 */
		// $this->go_to_edit_post( site_url() . '/wp-admin/post.php?post=' . $this->post_ids[0] . '&action=edit' );
		// OR ( Could change to override function as well)
		// $this->go_to( site_url() . '/wp-admin/post.php?post=' . $this->post_ids[0] . '&action=edit' );
		// unset( $GLOBALS['wp_query'], $GLOBALS['wp_the_query'] );
		// $GLOBALS['wp_the_query'] = new WP_Query();
		// $GLOBALS['wp_query']     = $GLOBALS['wp_the_query'];
		$this->go_to_edit_post( site_url() . '/wp-admin/post.php?post=' . $this->post_ids[0] . '&action=edit' );

		/*
		 * Unit Testcase go_to workaround.
		 *
		 * The global $post variable isn't being properly set
		 */
		// - Operations in `/wp-admin/post.php`.
		// Set global $post with the post ID. $post = get_post( $post_id );
		global $post, $post_type, $post_type_object;
		if ( ! is_object( $post ) || $post->ID !== $this->post_ids[0] ) {
			$post = get_post( $this->post_ids[0] );
		}
		// Set global $post_type with $post->post_type.
		$post_type        = $post->post_type;
		$post_type_object = get_post_type_object( $post_type );
		// Sets global post.
		$post = get_post( $this->post_ids[0], OBJECT, 'edit' );

		// - Operations in All_in_One_SEO_Pack::get_page_snippet_info().
		// The global $wp_query is still un-initiated/null values.
		// global $post is set to page being edited. $post = get_post( ID )
		global $wp_query;
		$wp_query->is_single = true;
		$this->is_front_page = false;

		// - Operation in test function.
		// Would need to be empty
		// $aioseop_options['aiosp_customize_canonical_links'].
		global $aioseop_options;
		$aioseop_options['aiosp_no_paged_canonical_links']  = false;
		$aioseop_options['aiosp_customize_canonical_links'] = false;
		$t01 = $aioseop_class->aiosp_mrt_get_url( $wp_query, true );
		$t02 = $aioseop_class->aiosp_mrt_get_url( $wp_query, false );
		$this->assertFalse( $t01, 'All_in_One_SEO_Pack_Sitemap::aiosp_mrt_get_url() has failed on Admin Post-Edit screen. \tests\modules\general\test-All_in_One_SEO_Pack-aiospMrtGetUrl.php' );
		$this->assertFalse( $t02, 'All_in_One_SEO_Pack_Sitemap::aiosp_mrt_get_url() has failed on Admin Post-Edit screen. \tests\modules\general\test-All_in_One_SEO_Pack-aiospMrtGetUrl.php' );

		global $aioseop_options;
		$aioseop_options['aiosp_no_paged_canonical_links']  = true;
		$aioseop_options['aiosp_customize_canonical_links'] = true;
		$t03 = $aioseop_class->aiosp_mrt_get_url( $wp_query, true );
		$t04 = $aioseop_class->aiosp_mrt_get_url( $wp_query, false );
		$this->assertFalse( $t03, 'All_in_One_SEO_Pack_Sitemap::aiosp_mrt_get_url() has failed on Admin Post-Edit screen. \tests\modules\general\test-All_in_One_SEO_Pack-aiospMrtGetUrl.php' );
		$this->assertFalse( $t04, 'All_in_One_SEO_Pack_Sitemap::aiosp_mrt_get_url() has failed on Admin Post-Edit screen. \tests\modules\general\test-All_in_One_SEO_Pack-aiospMrtGetUrl.php' );
	}

	/**
	 * Override function for go_to edit-posts
	 *
	 * @since 2.4
	 *
	 * @see WP_UnitTestCase::go_to()
	 *
	 * @param string $url The URL for the request.
	 */
	public function go_to_edit_post( $url ) {
		parent::go_to( $url );
		unset( $GLOBALS['wp_query'], $GLOBALS['wp_the_query'] );
		$GLOBALS['wp_the_query'] = new WP_Query();
		$GLOBALS['wp_query']     = $GLOBALS['wp_the_query'];
	}
}
