import SwiftUI

struct DevicesView: View {
    @EnvironmentObject var appState: AppState
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            List {
                if !appState.locks.isEmpty {
                    Section("Locks") {
                        ForEach(filteredDevices(appState.locks)) { device in
                            LockRow(device: device)
                        }
                    }
                }

                if !appState.cameras.isEmpty {
                    Section("Cameras & Doorbells") {
                        ForEach(filteredDevices(appState.cameras)) { device in
                            DeviceRow(device: device)
                        }
                    }
                }

                if !appState.lights.isEmpty {
                    Section("Lights & Switches") {
                        ForEach(filteredDevices(appState.lights)) { device in
                            ToggleDeviceRow(device: device)
                        }
                    }
                }

                if !appState.otherDevices.isEmpty {
                    Section("Other") {
                        ForEach(filteredDevices(appState.otherDevices)) { device in
                            DeviceRow(device: device)
                        }
                    }
                }
            }
            .navigationTitle("Devices")
            .searchable(text: $searchText, prompt: "Search devices")
            .refreshable {
                await appState.loadDevices()
            }
            .overlay {
                if appState.devices.isEmpty && !appState.isLoading {
                    ContentUnavailableView(
                        "No Devices",
                        systemImage: "square.grid.2x2.fill",
                        description: Text("Connect your smart home adapters to see devices")
                    )
                }
            }
        }
    }

    private func filteredDevices(_ devices: [Device]) -> [Device] {
        if searchText.isEmpty { return devices }
        return devices.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.room.localizedCaseInsensitiveContains(searchText)
        }
    }
}

// MARK: - Lock Row

struct LockRow: View {
    let device: Device
    @EnvironmentObject var appState: AppState
    @State private var isActing = false

    var body: some View {
        HStack {
            Image(systemName: device.lockState == .locked ? "lock.fill" : "lock.open.fill")
                .foregroundStyle(device.lockState == .locked ? .green : .red)
                .frame(width: 30)

            VStack(alignment: .leading) {
                Text(device.name)
                    .font(.body)
                HStack(spacing: 4) {
                    Circle()
                        .fill(device.online ? .green : .red)
                        .frame(width: 6, height: 6)
                    Text(device.online ? device.lockState.rawValue.capitalized : "Offline")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if !device.room.isEmpty {
                        Text("  \(device.room)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            if isActing {
                ProgressView()
            } else {
                Button(device.lockState == .locked ? "Unlock" : "Lock") {
                    Task {
                        isActing = true
                        if device.lockState == .locked {
                            await appState.unlockDevice(device.id)
                        } else {
                            await appState.lockDevice(device.id)
                        }
                        isActing = false
                    }
                }
                .buttonStyle(.bordered)
                .tint(device.lockState == .locked ? .orange : .green)
                .controlSize(.small)
            }
        }
    }
}

// MARK: - Toggle Device Row (lights, switches)

struct ToggleDeviceRow: View {
    let device: Device
    @EnvironmentObject var appState: AppState
    @State private var isActing = false

    var body: some View {
        HStack {
            Image(systemName: device.deviceType.icon)
                .foregroundStyle(.yellow)
                .frame(width: 30)

            VStack(alignment: .leading) {
                Text(device.name)
                HStack(spacing: 4) {
                    Circle()
                        .fill(device.online ? .green : .red)
                        .frame(width: 6, height: 6)
                    Text(device.online ? "Online" : "Offline")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if isActing {
                ProgressView()
            } else {
                HStack(spacing: 8) {
                    Button {
                        Task {
                            isActing = true
                            await appState.toggleDevice(device.id, on: true)
                            isActing = false
                        }
                    } label: {
                        Image(systemName: "power")
                    }
                    .buttonStyle(.bordered)
                    .tint(.green)
                    .controlSize(.small)

                    Button {
                        Task {
                            isActing = true
                            await appState.toggleDevice(device.id, on: false)
                            isActing = false
                        }
                    } label: {
                        Image(systemName: "power")
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                    .controlSize(.small)
                }
            }
        }
    }
}

// MARK: - Generic Device Row

struct DeviceRow: View {
    let device: Device

    var body: some View {
        HStack {
            Image(systemName: device.deviceType.icon)
                .foregroundStyle(.blue)
                .frame(width: 30)

            VStack(alignment: .leading) {
                Text(device.name)
                HStack(spacing: 4) {
                    Circle()
                        .fill(device.online ? .green : .red)
                        .frame(width: 6, height: 6)
                    Text(device.online ? "Online" : "Offline")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if !device.room.isEmpty {
                        Text("  \(device.room)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Text(device.deviceType.label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
