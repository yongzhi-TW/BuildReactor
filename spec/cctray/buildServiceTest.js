define([
	'cctray/buildService',
	'cctray/ccRequest',
	'timer',
	'jquery',
	'signals',
	'jasmineSignals',
	'text!spec/fixtures/cctray/cruisecontrolnet.xml'
],
function (BuildService, ccRequest, Timer, $, signals, jasmineSignals, projectsXmlText) {

	'use strict';

	describe('cctray/buildService', function () {

		var service,
			settings,
			mockRequest,
			mockTimer,
			spyOnSignal = jasmineSignals.spyOnSignal,
			responseReceived,
			errorReceived,
			projectsXml = $.parseXML(projectsXmlText),
			initResponse = function () {
				mockRequest.andCallFake(function () {
					responseReceived.dispatch(projectsXml);
					return {
						responseReceived: responseReceived,
						errorReceived: errorReceived
					};
				});
			},
			initErrorResponse = function () {
				mockRequest.andCallFake(function () {
					errorReceived.dispatch({ message: 'ajax error' });
					return {
						responseReceived: responseReceived,
						errorReceived: errorReceived
					};
				});
			};

		beforeEach(function () {
			responseReceived = new signals.Signal();
			responseReceived.memorize = true;
			errorReceived = new signals.Signal();
			errorReceived.memorize = true;
			settings = {
				name: 'My Bamboo CI',
				username: null,
				password: null,
				url: 'http://example.com/',
				updateInterval: 10000,
				projects: ['CruiseControl.NET', 'NetReflector']
			};
			service = new BuildService(settings);
			mockRequest = spyOn(ccRequest, 'projects');
			initResponse();
			mockTimer = spyOn(Timer.prototype, 'start');
		});

		
		it('should require service name', function () {
			expect(function () {
				var service = new BuildService({
					name: null,
					url: 'http://example.com/',
					updateInterval: 10000
				});
			}).toThrow();
		});

		it('should expose service interface', function () {
			expect(service.name).toBe(settings.name);
			expect(service.on.brokenBuild).toBeDefined();
			expect(service.on.fixedBuild).toBeDefined();
			expect(service.on.errorThrown).toBeDefined();
			expect(service.on.updating).toBeDefined();
			expect(service.on.updated).toBeDefined();
		});

		it('should get projects state on start', function () {
			service.start();

			expect(mockRequest).toHaveBeenCalled();
			expect(service.projects['CruiseControl.NET']).toBeDefined();
			expect(service.projects['NetReflector']).toBeDefined();
		});

		it('should try again if request failed', function () {
			// TODO: this looks ugly, time for a mock builder ?
			var attempt = 0,
				updatedSpy = spyOnSignal(service.on.updated);
			mockTimer.andCallFake(function () {
				if (attempt <= 1) {
					this.on.elapsed.dispatch();
				}
			});
			mockRequest.andCallFake(function () {
				attempt++;
				responseReceived = new signals.Signal();
				responseReceived.memorize = true;
				errorReceived = new signals.Signal();
				errorReceived.memorize = true;
				if (attempt <= 1) {
					errorReceived.dispatch({ message: 'ajax error' });
				} else {
					responseReceived.dispatch(projectsXml);
				}
				return {
					responseReceived: responseReceived,
					errorReceived: errorReceived
				};
			});

			service.start();

			expect(updatedSpy).toHaveBeenDispatched(2);
			expect(mockRequest.callCount).toBe(2);
			expect(mockTimer).toHaveBeenCalled();
		});

		it('should not start if update interval not set', function () {
			var service1 = new BuildService({
				name: 'My Bamboo CI',
				updateInterval: undefined,
				url: 'http://example.com/'
			});

			expect(function () { service1.start(); }).toThrow();
		});

		it('should signal updated when update finished', function () {
			var updatedSpy = spyOnSignal(service.on.updated);

			service.update();

			expect(updatedSpy).toHaveBeenDispatched(1);
		});

		it('should signal updated when finished with error', function () {
			var updatedSpy = spyOnSignal(service.on.updated);
			initErrorResponse();

			service.update();

			expect(updatedSpy).toHaveBeenDispatched(1);
		});

		it('should signal errorThrown when update failed', function () {
			var errorThrownSpy = spyOnSignal(service.on.errorThrown);
			initErrorResponse();

			service.update();

			expect(errorThrownSpy).toHaveBeenDispatched();
		});


		it('should update until stopped', function () {
			mockTimer.andCallFake(function () {
				this.on.elapsed.dispatch();
			});
			var updatingSpy = spyOnSignal(service.on.updating).matching(function () {
				if (this.count > 2) {
					service.stop();
					return false;
				}
				return true;
			});

			service.start();

			expect(updatingSpy).toHaveBeenDispatched(3);
		});

		it('multiple services should update independently', function () {
			var service1 = new BuildService({ name: 'Bamboo', url: 'http://example1.com/', projects: [] }),
				updatingSpy1 = spyOnSignal(service1.on.updating),
				service2 = new BuildService({ name: 'Bamboo', url: 'http://example2.com/', projects: [] }),
				updatingSpy2 = spyOnSignal(service2.on.updating);

			service1.update();
			service2.update();

			expect(updatingSpy1).toHaveBeenDispatched(1);
			expect(updatingSpy2).toHaveBeenDispatched(1);
		});

		it('should signal brokenBuild if project signaled', function () {
			var failedProject,
				brokenBuildSpy = spyOnSignal(service.on.brokenBuild).matching(function (info) {
					return info.buildName === 'NetReflector' &&
						info.group === 'CruiseControl.NET';
				});
			initResponse();
			service.update();
			failedProject = service.projects['NetReflector'];

			failedProject.failed.dispatch(failedProject);

			expect(brokenBuildSpy).toHaveBeenDispatched(1);
		});

		it('should signal fixedBuild if project signaled', function () {
			var fixedProject,
				fixedBuildSpy = spyOnSignal(service.on.fixedBuild).matching(function (info) {
					return info.buildName === 'NetReflector' &&
						info.group === 'CruiseControl.NET';
				});
			initResponse();
			service.update();
			fixedProject = service.projects['NetReflector'];

			fixedProject.fixed.dispatch(fixedProject);

			expect(fixedBuildSpy).toHaveBeenDispatched(1);
		});

		it('should ignore plans that are not monitored', function () {
			service.update();

			expect(service.projects['FastForward.NET']).not.toBeDefined();
		});

	});
});