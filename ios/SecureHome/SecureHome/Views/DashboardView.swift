import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Connection status
                    if !appState.serverConnected {
                        HStack {
                            Image(systemName: "wifi.slash")
                            Text("Not connected to server")
                        }
                        .foregroundStyle(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.red.gradient, in: RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal)
                    }

                    // Security status card
                    SecurityStatusCard(nightCheck: appState.nightCheck)
                        .padding(.horizontal)

                    // Quick stats
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                    ], spacing: 12) {
                        StatCard(
                            title: "Devices",
                            value: "\(appState.devices.count)",
                            icon: "square.grid.2x2",
                            color: .blue
                        )
                        StatCard(
                            title: "Locks",
                            value: "\(appState.locks.count)",
                            icon: "lock.fill",
                            color: locksColor
                        )
                        StatCard(
                            title: "Cameras",
                            value: "\(appState.cameras.count)",
                            icon: "video.fill",
                            color: .purple
                        )
                        StatCard(
                            title: "Visitors Today",
                            value: "\(appState.visitorSummary?.totalPersonEvents ?? 0)",
                            icon: "person.fill",
                            color: .orange
                        )
                    }
                    .padding(.horizontal)

                    // Device groups
                    if !appState.locks.isEmpty {
                        DeviceGroupSection(title: "Locks", devices: appState.locks)
                    }
                    if !appState.lights.isEmpty {
                        DeviceGroupSection(title: "Lights", devices: appState.lights)
                    }
                    if !appState.cameras.isEmpty {
                        DeviceGroupSection(title: "Cameras", devices: appState.cameras)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("SecureHome")
            .refreshable {
                await appState.refreshAll()
            }
            .overlay {
                if appState.isLoading && appState.devices.isEmpty {
                    ProgressView("Loading...")
                }
            }
        }
    }

    private var locksColor: Color {
        let hasUnlocked = appState.locks.contains { $0.lockState == .unlocked }
        return hasUnlocked ? .red : .green
    }
}

// MARK: - Security Status Card

struct SecurityStatusCard: View {
    let nightCheck: NightCheckResult?

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: isSecure ? "checkmark.shield.fill" : "exclamationmark.shield.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(isSecure ? .green : .red)

                VStack(alignment: .leading, spacing: 4) {
                    Text(isSecure ? "Home Secure" : "Attention Needed")
                        .font(.headline)
                    Text(statusDetail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            if let check = nightCheck, !check.allSecure {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(check.unlockedLocks) { lock in
                        Label("\(lock.name) is unlocked", systemImage: "lock.open.fill")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    ForEach(check.openDoors) { door in
                        Label("\(door.name) is open", systemImage: "door.left.hand.open")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var isSecure: Bool {
        nightCheck?.allSecure ?? true
    }

    private var statusDetail: String {
        guard let check = nightCheck else { return "Tap to run security check" }
        if check.allSecure {
            return "All locks secured, all doors closed"
        }
        let issues = check.unlockedLocks.count + check.openDoors.count
        return "\(issues) issue\(issues == 1 ? "" : "s") found"
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Device Group Section

struct DeviceGroupSection: View {
    let title: String
    let devices: [Device]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(devices) { device in
                        DeviceCard(device: device)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Device Card (compact)

struct DeviceCard: View {
    let device: Device
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: device.deviceType.icon)
                .font(.title2)
                .foregroundStyle(statusColor)

            Text(device.name)
                .font(.caption)
                .lineLimit(1)

            Text(statusText)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(width: 90, height: 100)
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .onTapGesture {
            Task { await handleTap() }
        }
    }

    private var statusColor: Color {
        if !device.online { return .gray }
        switch device.deviceType {
        case .lock:
            return device.lockState == .locked ? .green : .red
        case .light:
            return .yellow
        default:
            return .blue
        }
    }

    private var statusText: String {
        if !device.online { return "Offline" }
        switch device.deviceType {
        case .lock:
            return device.lockState.rawValue.capitalized
        case .door:
            return device.doorState.rawValue.capitalized
        default:
            return "Online"
        }
    }

    private func handleTap() async {
        switch device.deviceType {
        case .lock:
            if device.lockState == .locked {
                await appState.unlockDevice(device.id)
            } else {
                await appState.lockDevice(device.id)
            }
        case .light:
            await appState.toggleDevice(device.id, on: true)
        default:
            break
        }
    }
}
