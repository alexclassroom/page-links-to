const { test: base, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Custom test fixture that provides WordPress helper utilities.
 */
const test = base.extend({
	/**
	 * Run a WP-CLI command.
	 */
	wpCli: async ({}, use) => {
		const wpCli = (command) => {
			return execSync(`wp ${command}`, { stdio: 'pipe' }).toString().trim();
		};
		await use(wpCli);
	},

	/**
	 * Activate a WordPress plugin.
	 */
	activatePlugin: async ({}, use) => {
		const activatePlugin = (plugin) => {
			execSync(`wp plugin install --activate ${plugin}`, { stdio: 'pipe' });
		};
		await use(activatePlugin);
	},

	/**
	 * Deactivate a WordPress plugin.
	 */
	deactivatePlugin: async ({}, use) => {
		const deactivatePlugin = (plugin) => {
			execSync(`wp plugin deactivate ${plugin}`, { stdio: 'pipe' });
		};
		await use(deactivatePlugin);
	},

	/**
	 * Enable pretty permalinks.
	 */
	enablePrettyPermalinks: async ({}, use) => {
		const enablePrettyPermalinks = () => {
			execSync(`wp rewrite structure '/%postname%/'`, { stdio: 'pipe' });
		};
		await use(enablePrettyPermalinks);
	},

	/**
	 * Simulate WP admin menu hover by adding the CSS class.
	 */
	hoverWpMenuItem: async ({ page }, use) => {
		const hoverWpMenuItem = async (selector) => {
			await page.locator(selector).evaluate((el) => {
				el.classList.add('opensub');
			});
		};
		await use(hoverWpMenuItem);
	},

	/**
	 * Add a mu-plugin file (auto-removed after test).
	 */
	muPlugin: async ({}, use) => {
		const created = [];

		const muPlugin = (filename, content) => {
			const muDir = path.resolve(__dirname, '../../../mu-plugins');
			const filePath = path.join(muDir, filename);
			fs.mkdirSync(muDir, { recursive: true });
			fs.writeFileSync(filePath, content);
			created.push(filePath);
		};

		await use(muPlugin);

		// Cleanup: remove all mu-plugins created during this test.
		for (const filePath of created) {
			try {
				fs.unlinkSync(filePath);
			} catch (e) {
				// Ignore if already removed.
			}
		}
	},
});

module.exports = { test, expect };
