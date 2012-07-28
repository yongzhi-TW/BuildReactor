define([
		'serviceController',
		'notificationController',
		'badgeController',
		'settingsStore',
		'serviceTypesRepository',
		'backgroundLogger'
	], function (serviceController, notificationController, badgeController, settingsStore, serviceTypesRepository, backgroundLogger) {

		'use strict';

		backgroundLogger();
		var settings = settingsStore.getAll();
		badgeController();
		notificationController();
		serviceController.load(settings);

		return {
			run: function () {
				serviceController.run();
			},
			getSettings: function () {
				return settingsStore.getAll();
			},
			updateSettings: function (newSettings) {
				settingsStore.store(newSettings);
				serviceController.load(newSettings);
				serviceController.run();
			},
			getSupportedServiceTypes: function () {
				return serviceTypesRepository;
			}
		};
	});