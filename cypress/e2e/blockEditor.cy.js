import { faker } from '@faker-js/faker';

const postTitle = () => {
	const parts = [faker.lorem.word(), faker.lorem.word(), faker.number.int()];

	return parts.join(' ');
};

function tid(id) {
	return cy.get(`[data-testid=${id}]`);
}

const selectors = {
	saveButton: () => cy.get('.editor-post-save-draft'),
	publishButton: () => cy.get('.editor-post-publish-button'),
	savedNotice: () => cy.get('.editor-post-saved-state.is-saved'),
	chooseWordPress: () =>
		cy.get('.plt-panel input[type="radio"][value="wordpress"]'),
	chooseCustom: () => cy.get('.plt-panel input[type="radio"][value="custom"]'),
	newTab: () => tid('plt-newtab'),
	url: () => tid('plt-url'),
};

const clickCustom = () => {
	selectors.chooseCustom().click({ force: true });
};

const clickWordPress = () => {
	selectors.chooseWordPress().click({ force: true });
};

const openPanel = () => {
	cy.get('.plt-panel').then(($panel) => {
		if (!$panel.hasClass('is-opened')) {
			cy.wrap($panel).click();
		}
	});
};

const scrollPanelIntoView = () => {
	cy.get('.plt-panel').scrollIntoView();
};

const assertWordPress = () => {
	scrollPanelIntoView();
	selectors.chooseWordPress().should('be.visible').and('be.checked');
	selectors.chooseCustom().should('be.visible').and('not.be.checked');
	cy.get('[data-testid=plt-url]').should('not.exist');
	cy.get('[data-testid=plt-newtab]').should('not.exist');
};

const assertCustom = () => {
	scrollPanelIntoView();
	selectors.chooseCustom().should('be.visible').and('be.checked');
	selectors.chooseWordPress().should('be.visible').and('not.be.checked');
	selectors.url().should('be.visible');
	selectors.newTab().should('be.visible');
};

const save = () => {
	selectors.saveButton().click();
	selectors.savedNotice().should('be.visible');
	cy.reload();
	openPanel();
};

describe('Block Editor', () => {
	const linkedUrl = Cypress.config().baseUrl + '/?3';
	const draftTitle = postTitle();
	const draftSlug = draftTitle.toLowerCase().replace(/ /g, '-');

	it('supports Page Links To panel with radio buttons, URL persistence, and new tab checkbox', () => {
		cy.login();
		cy.deactivatePlugin('classic-editor');

		// Disable editor modals (welcome guide, pattern chooser) via user preferences
		// before visiting the editor so they don't cover the UI.
		cy.wpCli(`eval '$prefs = get_user_meta(1, "wp_persisted_preferences", true); if (!is_array($prefs)) $prefs = []; $prefs["core/edit-post"] = ["welcomeGuide" => false]; $prefs["core/edit-page"] = ["welcomeGuide" => false]; $prefs["core"] = array_merge($prefs["core"] ?? [], ["enableChoosePatternModal" => false, "distractionFree" => false, "isResumed" => true]); $prefs["_modified"] = gmdate("c"); update_user_meta(1, "wp_persisted_preferences", $prefs);'`);

		cy.visit('/wp-admin/post-new.php?post_type=page');
		cy.url().should('contain', '/wp-admin/post-new.php?post_type=page');

		// In WordPress 6.x+, the editor canvas is inside an iframe.
		cy.get('iframe[name="editor-canvas"]')
			.its('0.contentDocument.body')
			.should('not.be.empty')
			.then(cy.wrap)
			.find('[aria-label="Add title"], .editor-post-title__input')
			.first()
			.click({ force: true })
			.type(draftTitle);

		// Open the PLT panel.
		openPanel();

		// Starts with WordPress URL selected.
		assertWordPress();

		// Stays the same after saving a draft.
		selectors.saveButton().click();
		selectors.savedNotice().should('be.visible');
		assertWordPress();

		// Choosing custom shows custom UI.
		clickCustom();
		assertCustom();

		// Choosing WordPress hides custom UI.
		clickWordPress();
		assertWordPress();

		// URL persists through changing link type.
		clickCustom();
		selectors.url().clear().type(linkedUrl);
		clickWordPress();
		clickCustom();
		selectors.url().should('have.value', linkedUrl);

		// URL saves its state.
		save();
		selectors.chooseCustom().should('be.checked');
		selectors.url().should('have.value', linkedUrl);

		// New tab checkbox persists through checking/unchecking.
		selectors.newTab().check();
		selectors.newTab().should('be.checked');
		clickWordPress();
		clickCustom();
		selectors.newTab().should('be.checked');

		// New tab checkbox saves its state.
		save();
		selectors.newTab().should('be.checked');

		// Publish and verify the short URL redirects to the custom URL.
		cy.get('.editor-post-publish-panel__toggle').click();
		selectors.publishButton().click();
		cy.request({
			url: `/${draftSlug}/`,
			followRedirect: false,
			failOnStatusCode: false,
		}).then((resp) => {
			expect(resp.status).to.eq(301);
			expect(resp.redirectedToUrl).to.eq(linkedUrl);
		});
	});
});
