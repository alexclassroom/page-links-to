const { test, expect } = require('./fixtures');

test.describe('Pattern Transition (#186)', () => {
	test('hides PLT panel when the current post type is unsupported', async ({
		page,
		wpCli,
		deactivatePlugin,
		muPlugin,
	}) => {
		deactivatePlugin('classic-editor');

		// Filter wp_block out of PLT's supported post types via a mu-plugin.
		muPlugin(
			'plt-e2e-filter-wp-block.php',
			`<?php
			add_filter( 'page-links-to-post-types', function( $types ) {
				return array_values( array_diff( $types, array( 'wp_block' ) ) );
			});`
		);

		// Create a synced pattern (wp_block post) to navigate to.
		const patternId = wpCli(
			`post create --post_type=wp_block --post_title="PLT E2E Pattern" --post_content='<!-- wp:paragraph --><p>Pattern content</p><!-- /wp:paragraph -->' --post_status=publish --porcelain`
		);

		// Disable editor modals (welcome guide, pattern chooser) via user preferences.
		wpCli(
			`eval '$prefs = get_user_meta(1, "wp_persisted_preferences", true); if (!is_array($prefs)) $prefs = []; $prefs["core/edit-post"] = ["welcomeGuide" => false]; $prefs["core/edit-page"] = ["welcomeGuide" => false]; $prefs["core"] = array_merge($prefs["core"] ?? [], ["enableChoosePatternModal" => false, "distractionFree" => false, "isResumed" => true]); $prefs["_modified"] = gmdate("c"); update_user_meta(1, "wp_persisted_preferences", $prefs);'`
		);

		// Navigate to the page editor. The PLT script is enqueued because
		// "page" is a supported post type.
		await page.goto('/wp-admin/post-new.php?post_type=page');
		await expect(page).toHaveURL(/\/wp-admin\/post-new\.php\?post_type=page/);

		// The PLT panel should be visible for a page.
		const pltPanel = page.locator('.plt-panel');
		await expect(pltPanel).toBeVisible();

		// Simulate a client-side transition to the pattern post. This mirrors
		// what happens when the block editor switches context without a full
		// page reload (e.g., the focus-mode "Edit original" flow for synced
		// patterns in WP 6.4–6.7, or any future client-side navigation).
		// We reinitialise the editor store for the pattern post so that
		// getCurrentPostType() returns 'wp_block'.
		await page.evaluate(async (id) => {
			const post = await wp.apiFetch({
				path: `/wp/v2/blocks/${id}?context=edit`,
			});
			await wp.data.dispatch('core/editor').setupEditor(post, {});
		}, patternId);

		// Wait for the editor to reflect the wp_block post type.
		await page.waitForFunction(
			() => {
				try {
					return (
						wp.data.select('core/editor').getCurrentPostType() === 'wp_block'
					);
				} catch (e) {
					return false;
				}
			},
			{ timeout: 10000 }
		);

		// The PLT panel should NOT be visible since wp_block is filtered out.
		await expect(pltPanel).not.toBeVisible({ timeout: 5000 });

		// Cleanup: delete the test pattern.
		wpCli(`post delete ${patternId} --force`);
	});
});
