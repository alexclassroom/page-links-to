import { faker } from '@faker-js/faker';

const postSlug = () => {
	const parts = [faker.lorem.slug(), faker.lorem.slug(), faker.number.int()];

	return parts.join('-');
};

const postTitle = () => {
	const parts = [faker.lorem.word(), faker.lorem.word(), faker.number.int()];

	return parts.join(' ');
};

describe('Quick Links', () => {
	const subMenuTitle = 'Add Page Link';
	const publishSlug = postSlug();
	const linkedUrl = Cypress.config().baseUrl + '/?4';
	const draftTitle = postTitle();
	const longTitle = 'Super Long Title Way Too Long';
	const draftSlug = 'draft-' + postSlug();

	it('supports Add Page Link modal with slug generation, publish, and draft', () => {
		cy.login();
		cy.enablePrettyPermalinks();
		cy.visit('/wp-admin/');
		cy.location('pathname').should('eq', '/wp-admin/');

		// Submenu item starts hidden.
		cy.get('#menu-pages').contains(subMenuTitle).should('not.be.visible');

		// Submenu item is visible on hover.
		cy.get('#menu-pages').hoverWpMenuItem();
		cy.get('#menu-pages').contains(subMenuTitle).should('be.visible');

		// Modal starts hidden.
		cy.get('#plt-quick-add').should('not.be.visible');

		// Modal is visible after clicking submenu item.
		cy.get('#menu-pages').contains(subMenuTitle).click();
		cy.get('#plt-quick-add').should('be.visible');

		// Modal is closed after clicking the close button.
		cy.get('.ui-dialog-titlebar-close').first().click();
		cy.get('#plt-quick-add').should('not.be.visible');

		// Modal is closed after clicking outside, then reopened.
		cy.get('#menu-pages').contains(subMenuTitle).click();
		cy.get('#plt-quick-add').should('be.visible');
		cy.get('body').click(1, 1);
		cy.get('#plt-quick-add').should('not.be.visible');
		cy.get('#menu-pages').contains(subMenuTitle).click({ force: true });
		cy.get('#plt-quick-add').should('be.visible');

		// Fields start empty.
		cy.get('#plt-quick-add input[name="title"]').should('be.empty');
		cy.get('#plt-quick-add input[name="url"]').should('be.empty');
		cy.get('#plt-quick-add input[name="slug"]').should('be.empty');

		// Save and publish start disabled.
		cy.get('#plt-quick-add-publish').should('be.disabled');
		cy.get('#plt-quick-add-save').should('be.disabled');

		// Slug is populated as title is typed.
		cy.get('#plt-quick-add input[name="title"]').type('Short Title');
		cy.get('#plt-quick-add input[name="slug"]').should('have.attr', 'placeholder', 'short-title');
		cy.get('#plt-quick-add input[name="title"]').type(' link');
		cy.get('#plt-quick-add input[name="slug"]').should('have.attr', 'placeholder', 'short-title-link');

		// Length warning not visible for short slugs.
		cy.get('#plt-quick-add .short-url-message').should('not.be.visible');

		// Buttons enabled after URL and title are provided.
		cy.get('#plt-quick-add input[name="url"]').type(linkedUrl);
		cy.get('#plt-quick-add-save').should('not.be.disabled');
		cy.get('#plt-quick-add-publish').should('not.be.disabled');

		// Buttons disabled again if the title is emptied.
		cy.get('#plt-quick-add input[name="title"]').clear();
		cy.get('#plt-quick-add-publish').should('be.disabled');
		cy.get('#plt-quick-add-save').should('be.disabled');

		// Buttons re-enabled after the title is re-populated.
		cy.get('#plt-quick-add input[name="title"]').type('Short Two');
		cy.get('#plt-quick-add input[name="slug"]').should('have.attr', 'placeholder', 'short-two');
		cy.get('#plt-quick-add-save').should('not.be.disabled');
		cy.get('#plt-quick-add-publish').should('not.be.disabled');

		// Shows a warning for long slugs.
		cy.get('#plt-quick-add input[name="title"]').clear().type(longTitle);
		cy.get('#plt-quick-add .short-url-message').should('be.visible');

		// Gives feedback when a new link is published.
		cy.get('#plt-quick-add input[name="slug"]').type(publishSlug);
		cy.get('#plt-quick-add-publish').click();
		cy.get('#plt-quick-add').contains('New page link published!');

		// Published short URL redirects to the custom URL.
		cy.request({
			url: `/${publishSlug}/`,
			followRedirect: false,
		}).then((resp) => {
			expect(resp.status).to.eq(301);
			expect(resp.redirectedToUrl).to.eq(linkedUrl);
		});

		// Gives feedback when a new link is saved as a draft.
		cy.get('#plt-quick-add input[name="title"]').type(draftTitle);
		cy.get('#plt-quick-add input[name="slug"]').type(draftSlug);
		cy.get('#plt-quick-add input[name="url"]').type(linkedUrl);
		cy.get('#plt-quick-add-save').should('not.be.disabled').click();
		cy.get('#plt-quick-add').contains('Page link draft saved!');
	});
});
