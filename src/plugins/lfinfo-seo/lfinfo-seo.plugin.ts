// src/plugins/lfinfo-seo/lfinfo-seo.plugin.ts

import {
  LanguageCode,
  PluginCommonModule,
  VendurePlugin,
} from '@vendure/core';

@VendurePlugin({
  imports: [PluginCommonModule],

  configuration: config => {
    config.customFields.Product.push(
      {
        name: 'shortDescription',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Description courte' },
          { languageCode: LanguageCode.en, value: 'Short description' },
          { languageCode: LanguageCode.nl, value: 'Korte beschrijving' },
        ],
      },
      {
        name: 'metaTitle',
        type: 'localeString',
        public: true,
        nullable: true,
        length: 255,
        label: [
          { languageCode: LanguageCode.fr, value: 'Titre SEO' },
          { languageCode: LanguageCode.en, value: 'SEO title' },
          { languageCode: LanguageCode.nl, value: 'SEO-titel' },
        ],
      },
      {
        name: 'metaDescription',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Meta description' },
          { languageCode: LanguageCode.en, value: 'Meta description' },
          { languageCode: LanguageCode.nl, value: 'Meta description' },
        ],
      },
      {
        name: 'features',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Fonctionnalités' },
          { languageCode: LanguageCode.en, value: 'Features' },
          { languageCode: LanguageCode.nl, value: 'Functies' },
        ],
      },
      {
        name: 'benefits',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Avantages' },
          { languageCode: LanguageCode.en, value: 'Benefits' },
          { languageCode: LanguageCode.nl, value: 'Voordelen' },
        ],
      },
      {
        name: 'compatibility',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Compatibilité' },
          { languageCode: LanguageCode.en, value: 'Compatibility' },
          { languageCode: LanguageCode.nl, value: 'Compatibiliteit' },
        ],
      },
      {
        name: 'activationInstructions',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: "Instructions d'activation" },
          { languageCode: LanguageCode.en, value: 'Activation instructions' },
          { languageCode: LanguageCode.nl, value: 'Activeringsinstructies' },
        ],
      },
      {
        name: 'prerequisites',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Prérequis' },
          { languageCode: LanguageCode.en, value: 'Requirements' },
          { languageCode: LanguageCode.nl, value: 'Vereisten' },
        ],
      },
      {
        name: 'licenseInformation',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Informations de licence' },
          { languageCode: LanguageCode.en, value: 'License information' },
          { languageCode: LanguageCode.nl, value: 'Licentie-informatie' },
        ],
      },
      {
        name: 'seoKeywords',
        type: 'localeText',
        public: false,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Mots-clés SEO internes' },
          { languageCode: LanguageCode.en, value: 'Internal SEO keywords' },
          { languageCode: LanguageCode.nl, value: 'Interne SEO-zoekwoorden' },
        ],
      },
    );

    config.customFields.Collection.push(
      {
        name: 'shortDescription',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Introduction de catégorie' },
          { languageCode: LanguageCode.en, value: 'Category introduction' },
          { languageCode: LanguageCode.nl, value: 'Categorie-introductie' },
        ],
      },
      {
        name: 'seoContent',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Contenu SEO' },
          { languageCode: LanguageCode.en, value: 'SEO content' },
          { languageCode: LanguageCode.nl, value: 'SEO-inhoud' },
        ],
      },
      {
        name: 'metaTitle',
        type: 'localeString',
        public: true,
        nullable: true,
        length: 255,
        label: [
          { languageCode: LanguageCode.fr, value: 'Titre SEO' },
          { languageCode: LanguageCode.en, value: 'SEO title' },
          { languageCode: LanguageCode.nl, value: 'SEO-titel' },
        ],
      },
      {
        name: 'metaDescription',
        type: 'localeText',
        public: true,
        nullable: true,
        label: [
          { languageCode: LanguageCode.fr, value: 'Meta description' },
          { languageCode: LanguageCode.en, value: 'Meta description' },
          { languageCode: LanguageCode.nl, value: 'Meta description' },
        ],
      },
    );

    return config;
  },
})
export class LfinfoSeoPlugin {}
