<?php
namespace AIOSEO\Plugin\Common\Sitemap\Html;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles all queries for the HTML sitemap.
 *
 * @since 4.1.3
 */
class Query {
	/**
	 * Returns all eligible sitemap entries for a given post type.
	 *
	 * @since   4.1.3
	 * @version 4.9.10 Exclude password-protected posts to match the XML/image/archive sitemap queries.
	 * @version 5.0.2 Filter posts by robots meta; front page exempt unless excluded_posts lists it.
	 *
	 * @param  string $postType   The post type.
	 * @param  array  $attributes The attributes.
	 * @return array              The post objects.
	 */
	public function posts( $postType, $attributes ) {
		// Every column below is table-qualified, field list and ORDER BY included. aioseo_posts has an
		// id column and MySQL matches column names case-insensitively, so a bare ID is ambiguous the
		// moment that table is joined, and the error surfaces as an empty result rather than a failure.
		$fields  = 'p.ID, p.post_title,';
		$fields .= 'p.post_parent, p.post_date_gmt, p.post_modified_gmt';

		$orderBy = '';
		switch ( $attributes['order_by'] ) {
			case 'last_updated':
				$orderBy = 'p.post_modified_gmt';
				break;
			case 'alphabetical':
				$orderBy = 'p.post_title';
				break;
			case 'id':
				$orderBy = 'p.ID';
				break;
			case 'publish_date':
			default:
				$orderBy = 'p.post_date_gmt';
				break;
		}

		switch ( strtolower( $attributes['order'] ) ) {
			case 'desc':
				$orderBy .= ' DESC';
				break;
			default:
				$orderBy .= ' ASC';
		}

		$query = aioseo()->core->db
			->start( 'posts as p' )
			->select( $fields )
			->where( 'p.post_status', 'publish' )
			->where( 'p.post_type', $postType )
			->where( 'p.post_password', '' );

		$homePageId = (int) aioseo()->helpers->getHomePageId();

		$postsTable = aioseo()->core->db->db->prefix . 'aioseo_posts';

		// Mirrors the XML sitemap's row filter, so the exclusion notices stay honest. The static front
		// page is exempt: its editor hides No Index, so a value set before it was promoted can't be
		// cleared. Only while it is in effect, hence the helper over a raw page_on_front read.
		//
		// Both branches address aioseo_posts through a subquery rather than a join. The exemption has
		// to be OR-ed in at the top level, and an `OR` beside a joined row is not null-rejecting: it
		// makes the join unavoidable for every post of the type, and no index on the robots columns
		// can be used. Against a subquery the same OR costs nothing.
		if ( aioseo()->sitemap->helpers->isPostTypeEffectivelyNoindexed( $postType ) ) {
			// Only posts that have explicitly opted in.
			$query->whereRaw( "( `p`.`ID` IN (
				SELECT `post_id` FROM $postsTable WHERE `robots_default` = 0 AND `robots_noindex` = 0
			) OR `p`.`ID` = $homePageId )" );
		} else {
			// Excludes the explicitly noindexed set. The inner NOT IN is required for posts carrying
			// more than one aioseo_posts row (post_id is not a unique index): the left join this
			// replaces asked whether ANY row was indexable, so excluding on ANY noindexed row would
			// drop posts it kept.
			$query->whereRaw( "( `p`.`ID` NOT IN (
				SELECT `post_id` FROM $postsTable
				WHERE `robots_default` = 0 AND `robots_noindex` = 1
					AND `post_id` NOT IN (
						SELECT `post_id` FROM $postsTable WHERE `robots_default` = 1 OR `robots_noindex` = 0
					)
			) OR `p`.`ID` = $homePageId )" );
		}

		$excludedPosts = $this->getExcludedObjects( $attributes );
		if ( $excludedPosts ) {
			// An explicit per-instance exclusion outranks the front page's exemption; the site-wide
			// setting does not, which is what keeps this sitemap agreeing with the XML one.
			$instanceIds = array_map( 'intval', $this->getInstanceExcludedIds( $attributes, 'excluded_posts' ) );
			$exemptId    = in_array( $homePageId, $instanceIds, true ) ? 0 : $homePageId;

			$query->whereRaw( "( `p`.`ID` NOT IN ( $excludedPosts ) OR `p`.`ID` = $exemptId )" );
		}

		$posts = $query->orderBy( $orderBy )
			->run()
			->result();

		foreach ( $posts as $post ) {
			$post->ID = (int) $post->ID;
		}

		return $posts;
	}

	/**
	 * Returns all eligible sitemap entries for a given taxonomy.
	 *
	 * @since   4.1.3
	 * @version 5.0.2 Compare excluded term IDs to term_id directly.
	 * @version 5.0.2 Filter terms by robots meta to match the XML sitemap query.
	 *
	 * @param  string $taxonomy   The taxonomy name.
	 * @param  array  $attributes The attributes.
	 * @return array              The term objects.
	 */
	public function terms( $taxonomy, $attributes = [] ) {
		$fields            = 't.term_id, t.name, tt.parent';
		$termTaxonomyTable = aioseo()->core->db->db->prefix . 'term_taxonomy';

		$orderBy = '';
		switch ( $attributes['order_by'] ) {
			case 'alphabetical':
				$orderBy = 't.name';
				break;
			// We can only sort by date after getting the terms.
			case 'id':
			case 'publish_date':
			case 'last_updated':
			default:
				$orderBy = 't.term_id';
				break;
		}

		switch ( strtolower( $attributes['order'] ) ) {
			case 'desc':
				$orderBy .= ' DESC';
				break;
			default:
				$orderBy .= ' ASC';
		}

		$query = aioseo()->core->db
			->start( 'terms as t' )
			->select( $fields )
			->join( 'term_taxonomy as tt', 't.term_id = tt.term_id' )
			->whereRaw( "
			( `t`.`term_id` IN
				(
					SELECT `tt`.`term_id`
					FROM `$termTaxonomyTable` as tt
					WHERE `tt`.`taxonomy` = '$taxonomy'
					AND `tt`.`count` > 0
				)
			)" );

		// Apply the same row filter as Pro\Sitemap\Query::terms(). Without it this sitemap contradicts
		// the XML one and the exclusion notices on the Sitemaps screen: a term the settings exclude
		// still renders here. Pro-only, because aioseo_terms is a Pro table.
		if ( aioseo()->pro ) {
			if ( aioseo()->sitemap->helpers->isTaxonomyEffectivelyNoindexed( $taxonomy ) ) {
				// Only terms that have explicitly opted in.
				$query->join( 'aioseo_terms as at', '`at`.`term_id` = `t`.`term_id` AND `at`.`robots_default` = 0 AND `at`.`robots_noindex` = 0' );
			} else {
				$query->leftJoin( 'aioseo_terms as at', '`at`.`term_id` = `t`.`term_id`' );
				$query->whereRaw( '( `at`.`robots_noindex` IS NULL OR `at`.`robots_default` = 1 OR `at`.`robots_noindex` = 0 )' );
			}
		}

		$excludedTerms = $this->getExcludedObjects( $attributes, false );
		if ( $excludedTerms ) {
			$query->whereRaw( "( `t`.`term_id` NOT IN ( $excludedTerms ) )" );
		}

		$terms = $query->orderBy( $orderBy )
			->run()
			->result();

		foreach ( $terms as $term ) {
			$term->term_id  = (int) $term->term_id;
			$term->taxonomy = $taxonomy;
		}

		$shouldSort = false;
		if ( 'last_updated' === $attributes['order_by'] ) {
			$shouldSort = true;
			foreach ( $terms as $term ) {
				$term->timestamp = strtotime( aioseo()->sitemap->content->getTermLastModified( $term->term_id ) );
			}
		}

		if ( 'publish_date' === $attributes['order_by'] ) {
			$shouldSort = true;
			foreach ( $terms as $term ) {
				$term->timestamp = strtotime( $this->getTermPublishDate( $term->term_id ) );
			}
		}

		if ( $shouldSort ) {
			if ( 'asc' === strtolower( $attributes['order'] ) ) {
				usort( $terms, function( $term1, $term2 ) {
					return $term1->timestamp > $term2->timestamp ? 1 : 0;
				} );
			} else {
				usort( $terms, function( $term1, $term2 ) {
					return $term1->timestamp < $term2->timestamp ? 1 : 0;
				} );
			}
		}

		return $terms;
	}

	/**
	 * Returns a list of date archives that can be included.
	 *
	 * @since 4.1.3
	 *
	 * @return array The date archives.
	 */
	public function archives() {
		$result = aioseo()->core->db
			->start( 'posts', false, 'SELECT DISTINCT' )
			->select( 'YEAR(post_date) AS year, MONTH(post_date) AS month' )
			->where( 'post_type', 'post' )
			->where( 'post_status', 'publish' )
			->where( 'post_password', '' )
			->orderBy( 'year DESC' )
			->orderBy( 'month DESC' )
			->run()
			->result();

		$dates = [];
		foreach ( $result as $date ) {
			$dates[ $date->year ][ $date->month ] = 1;
		}

		return $dates;
	}

	/**
	 * Returns the publish date for a given term.
	 * This is the publish date of the oldest post that is assigned to the term.
	 *
	 * @since   4.1.3
	 * @version 5.0.2 Match the term ID through term_taxonomy.
	 *
	 * @param  int $termId The term ID.
	 * @return int         The publish date timestamp.
	 */
	public function getTermPublishDate( $termId ) {
		$termRelationshipsTable = aioseo()->core->db->db->prefix . 'term_relationships';
		$termTaxonomyTable      = aioseo()->core->db->db->prefix . 'term_taxonomy';

		$post = aioseo()->core->db
			->start( 'posts as p' )
			->select( 'MIN(`p`.`post_date_gmt`) as publish_date' )
			->whereRaw( "
			( `p`.`ID` IN
				(
					SELECT `tr`.`object_id`
					FROM `$termRelationshipsTable` as tr
					JOIN `$termTaxonomyTable` as tt ON `tr`.`term_taxonomy_id` = `tt`.`term_taxonomy_id`
					WHERE `tt`.`term_id` = '$termId'
				)
			)" )
			->run()
			->result();

		return ! empty( $post[0]->publish_date ) ? strtotime( $post[0]->publish_date ) : 0;
	}

	/**
	 * Returns a comma-separated string of excluded object IDs.
	 *
	 * @since 4.1.3
	 *
	 * @param  array   $attributes The attributes.
	 * @param  boolean $posts      Whether the objects are posts.
	 * @return string              The excluded object IDs.
	 */
	private function getExcludedObjects( $attributes, $posts = true ) {
		$excludedObjects = $posts
			? aioseo()->sitemap->helpers->excludedPosts()
			: aioseo()->sitemap->helpers->excludedTerms();
		$key             = $posts ? 'excluded_posts' : 'excluded_terms';

		$instanceIds = $this->getInstanceExcludedIds( $attributes, $key );
		if ( $instanceIds ) {
			$ids = array_merge( explode( ',', $excludedObjects ), $instanceIds );

			$excludedObjects = esc_sql( implode( ', ', array_filter( $ids, 'is_numeric' ) ) );
		}

		return $excludedObjects;
	}

	/**
	 * Returns the excluded object IDs a single embed asked for, without the site-wide setting.
	 *
	 * @since 5.0.2
	 *
	 * @param  array  $attributes The attributes.
	 * @param  string $key        The attribute name.
	 * @return array              The excluded object IDs.
	 */
	private function getInstanceExcludedIds( $attributes, $key ) {
		if ( empty( $attributes[ $key ] ) ) {
			return [];
		}

		// The block hands over an array of IDs; the shortcode and the widget a comma-separated string.
		$ids = [];
		if ( is_array( $attributes[ $key ] ) ) {
			$ids = $attributes[ $key ];
		}
		if ( is_string( $attributes[ $key ] ) ) {
			$ids = array_map( 'trim', explode( ',', $attributes[ $key ] ) );
		}

		return array_filter( $ids, 'is_numeric' );
	}
}