define([
	'settings/viewSettings/controller',
	'common-ui/core',
	'angular',
	'angularMocks'
], function (sidebar, core, angular, mocks) {
	'use strict';

	describe('settings/viewSettings/controller', function () {

		var scope;
		var controller;

		beforeEach(function () {
			spyOn(core, 'setViews');
		});

		beforeEach(module('settings'));

		beforeEach(inject(function ($controller, $compile, $rootScope) {
			scope = $rootScope.$new();
			controller = $controller('ViewSettingsCtrl', { $scope: scope });
		}));

		it('should set config on scope', function() {
			var viewConfig = { columns: 4 };
			
			core.views.onNext(viewConfig);
			scope.$digest();
			
			expect(scope.config).toEqual(viewConfig);
		});

		it('should save view config', function() {
			var viewConfig = { columns: 4 };
			
			scope.save(viewConfig);

			expect(core.setViews).toHaveBeenCalledWith(viewConfig);
		});

		it('should save when column width set', function() {
			scope.config = { fullWidthGroups: true };

			scope.setFixedWidth(true);

			expect(core.setViews).toHaveBeenCalledWith({ fullWidthGroups: false });
		});

		it('should not save when column width already set', function() {
			scope.config = { columns: 4, fullWidthGroups: true };
			
			scope.setFixedWidth(false);

			expect(core.setViews).not.toHaveBeenCalled();
		});

		it('should set services on scope', function() {
			var projects = [{ name: '' }];
			
			core.activeProjects.onNext(projects);
			scope.$digest();
			
			expect(scope.services).toEqual(projects);
		});

	});

});