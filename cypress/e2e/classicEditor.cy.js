import { faker } from '@faker-js/faker';

const postTitle = () => {
	const parts = [faker.lorem.word(), faker.lorem.word(), faker.number.int()];

	return parts.join(' ');
};

describe('Classic Editor', () => {
	const linkedUrl = Cypress.config().baseUrl + '/?1';
	const linkedUrl2 = Cypress.config().baseUrl + '/?2';
	const draftTitle = postTitle();
	const draftSlug = draftTitle.toLowerCase().replace(/ /g, '-');

	afterEach(() => {
		cy.deactivatePlugin('classic-editor');
	});

	it('supports Page Links To meta box with custom URL, new tab checkbox, and redirect', () => {
		cy.login();
		cy.enablePrettyPermalinks();
		cy.activatePlugin('classic-editor');
		cy.visit('/wp-admin/post-new.php?post_type=page');
		cy.url().should('contain', '/wp-admin/post-new.php?post_type=page');

		// Meta box is on the page.
		cy.scrollTo('bottom');
		cy.get('body').contains('Its normal WordPress URL');

		// Starts pointing to the normal WordPress URL.
		cy.get('#cws-links-to-choose-wp').should('be.checked');
		cy.get('#cws-links-to').should('not.be.visible');

		// Does not change after saving the page.
		cy.get('#title').type(draftTitle);
		cy.get('#save-post').click();
		cy.get('body').contains('Page draft updated');
		cy.get('#cws-links-to-choose-wp').should('be.checked');
		cy.get('#cws-links-to').should('not.be.visible');

		// Shows hidden fields when custom link option enabled.
		cy.scrollTo('bottom');
		cy.get('#cws-links-to-choose-custom').click().should('be.checked');
		cy.get('#cws-links-to-choose-wp').should('not.be.checked');
		cy.get('#cws-links-to').should('be.visible');
		cy.focused().should('have.attr', 'id', 'cws-links-to');
		cy.get('#cws-links-to-new-tab').should('not.be.checked');

		// Hides fields when custom link option is disabled.
		cy.get('#cws-links-to-choose-wp').click().should('be.checked');
		cy.get('#cws-links-to-choose-custom').should('not.be.checked');
		cy.get('#cws-links-to').should('not.be.visible');

		// Persists a custom URL.
		cy.scrollTo('bottom');
		cy.get('#cws-links-to-choose-custom').click().should('be.checked');
		cy.get('#cws-links-to').type(linkedUrl);
		cy.get('#save-post').click();
		cy.get('body').contains('Page draft updated');
		cy.scrollTo('bottom');
		cy.get('#cws-links-to-choose-custom').should('be.checked');
		cy.get('#cws-links-to').should('be.visible').and('have.value', linkedUrl);
		cy.get('#cws-links-to-new-tab').should('not.be.checked');

		// Persists the new tab checkbox.
		cy.get('#cws-links-to-new-tab').click().should('be.checked');
		cy.get('#save-post').click();
		cy.get('body').contains('Page draft updated');
		cy.get('#cws-links-to')
			.should('be.visible')
			.and('have.value', linkedUrl)
			.clear()
			.type(linkedUrl2);
		cy.get('#cws-links-to-new-tab').should('be.checked').click().should('not.be.checked');
		cy.get('#save-post').click();
		cy.get('body').contains('Page draft updated');
		cy.get('#cws-links-to').should('be.visible').and('have.value', linkedUrl2);
		cy.get('#cws-links-to-new-tab').should('not.be.checked');

		// Publish and verify the short URL redirects to the custom URL.
		cy.get('#publish').click();
		cy.request({
			url: `/${draftSlug}/`,
			followRedirect: false,
			failOnStatusCode: false,
		}).then((resp) => {
			expect(resp.status).to.eq(301);
			expect(resp.redirectedToUrl).to.eq(linkedUrl2);
		});
	});
});
