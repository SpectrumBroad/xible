'use strict'

/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */

describe('Nodepacks', function () {
  before(function () {
    cy.visit('http://localhost:9600');
  });

  describe('Navigate to nodepacks', function () {
    it('should contain clickable nodepacks link', function () {
      cy.get('a[href="/nodepacks"]').contains('Nodes').click();
      cy.url().should('include', '/nodepacks');
      cy.contains('h1', 'Nodepacks');
    });
  });

  describe('Nodepacks view', function () {
    it('should have base nodepacks viewable', function () {
      cy.contains('h2', 'xible');
      cy.contains('h2', 'core');
    });

    it('should scroll to reveal more nodepacks', function () {
      cy.get('#nodepacks').children().then((children) => {
        const oldChildrenLength = children.length;
        cy.get('.inner').scrollTo('bottom');
        cy.wait(500)

        cy.get('#nodepacks').children().then((newChildren) => {
          expect(newChildren.length).to.be.greaterThan(oldChildrenLength);
          cy.contains('h2', 'compare');
        })
      })
    })
  });
})
