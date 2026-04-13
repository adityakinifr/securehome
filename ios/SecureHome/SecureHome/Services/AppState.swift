import Foundation
import SwiftUI

@MainActor
class AppState: ObservableObject {
    @Published var devices: [Device] = []
    @Published var nightCheck: NightCheckResult?
    @Published var visitorSummary: VisitorSummary?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var serverConnected = false

    private let api = APIClient.shared

    // MARK: - Data Loading

    func refreshAll() async {
        isLoading = true
        errorMessage = nil

        async let devicesTask: () = loadDevices()
        async let nightCheckTask: () = loadNightCheck()
        async let summaryTask: () = loadVisitorSummary()

        _ = await (devicesTask, nightCheckTask, summaryTask)
        isLoading = false
    }

    func loadDevices() async {
        do {
            devices = try await api.fetchDevices()
            serverConnected = true
        } catch {
            errorMessage = error.localizedDescription
            serverConnected = false
        }
    }

    func loadNightCheck() async {
        do {
            nightCheck = try await api.fetchNightCheck()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadVisitorSummary() async {
        do {
            visitorSummary = try await api.fetchVisitorSummary()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Actions

    func lockDevice(_ deviceId: String) async {
        do {
            _ = try await api.lockDevice(deviceId)
            await loadDevices()
        } catch {
            errorMessage = "Failed to lock: \(error.localizedDescription)"
        }
    }

    func unlockDevice(_ deviceId: String) async {
        do {
            _ = try await api.unlockDevice(deviceId)
            await loadDevices()
        } catch {
            errorMessage = "Failed to unlock: \(error.localizedDescription)"
        }
    }

    func toggleDevice(_ deviceId: String, on: Bool) async {
        do {
            if on {
                _ = try await api.turnOn(deviceId)
            } else {
                _ = try await api.turnOff(deviceId)
            }
            await loadDevices()
        } catch {
            errorMessage = "Failed to toggle: \(error.localizedDescription)"
        }
    }

    func lockAll() async {
        do {
            _ = try await api.lockAll()
            await loadDevices()
            await loadNightCheck()
        } catch {
            errorMessage = "Failed to lock all: \(error.localizedDescription)"
        }
    }

    // MARK: - Helpers

    var locks: [Device] { devices.filter { $0.deviceType == .lock } }
    var cameras: [Device] { devices.filter { $0.deviceType == .camera || $0.deviceType == .doorbell } }
    var lights: [Device] { devices.filter { $0.deviceType == .light } }
    var otherDevices: [Device] { devices.filter { ![.lock, .camera, .doorbell, .light].contains($0.deviceType) } }
}
