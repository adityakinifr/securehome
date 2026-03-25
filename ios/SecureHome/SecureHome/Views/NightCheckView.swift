import SwiftUI

struct NightCheckView: View {
    @EnvironmentObject var appState: AppState
    @State private var isChecking = false
    @State private var isLockingAll = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Main status
                    statusCard

                    // Actions
                    actionButtons

                    // Issues list
                    if let check = appState.nightCheck, !check.allSecure {
                        issuesList(check)
                    }

                    // Lock overview
                    if !appState.locks.isEmpty {
                        lockOverview
                    }
                }
                .padding()
            }
            .navigationTitle("Security Check")
            .refreshable {
                await appState.loadNightCheck()
            }
        }
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 16) {
            Image(systemName: isSecure ? "checkmark.shield.fill" : "exclamationmark.shield.fill")
                .font(.system(size: 60))
                .foregroundStyle(isSecure ? .green : .red)
                .symbolEffect(.bounce, value: appState.nightCheck?.allSecure)

            Text(isSecure ? "All Secure" : "Issues Found")
                .font(.title2)
                .fontWeight(.bold)

            if let check = appState.nightCheck {
                Text("Last checked: \(formattedDate(check.checkedAt))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("Run a check to see your home's security status")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                Task {
                    isChecking = true
                    await appState.loadNightCheck()
                    isChecking = false
                }
            } label: {
                Label("Run Check", systemImage: "shield.checkered")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isChecking)

            if let check = appState.nightCheck, !check.allSecure {
                Button {
                    Task {
                        isLockingAll = true
                        await appState.lockAll()
                        isLockingAll = false
                    }
                } label: {
                    if isLockingAll {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Label("Lock All", systemImage: "lock.fill")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(isLockingAll)
            }
        }
    }

    // MARK: - Issues List

    private func issuesList(_ check: NightCheckResult) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Issues")
                .font(.headline)

            ForEach(check.unlockedLocks) { lock in
                HStack {
                    Image(systemName: "lock.open.fill")
                        .foregroundStyle(.red)
                    VStack(alignment: .leading) {
                        Text(lock.name)
                            .font(.body)
                        Text("Unlocked")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    Spacer()
                    Button("Lock") {
                        Task { await appState.lockDevice(lock.id) }
                    }
                    .buttonStyle(.bordered)
                    .tint(.green)
                    .controlSize(.small)
                }
                .padding()
                .background(.red.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
            }

            ForEach(check.openDoors) { door in
                HStack {
                    Image(systemName: "door.left.hand.open")
                        .foregroundStyle(.orange)
                    VStack(alignment: .leading) {
                        Text(door.name)
                            .font(.body)
                        Text("Open (\(Int(door.openPercent))%)")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                    Spacer()
                }
                .padding()
                .background(.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Lock Overview

    private var lockOverview: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All Locks")
                .font(.headline)

            ForEach(appState.locks) { lock in
                HStack {
                    Image(systemName: lock.lockState == .locked ? "lock.fill" : "lock.open.fill")
                        .foregroundStyle(lock.lockState == .locked ? .green : .red)
                        .frame(width: 24)

                    Text(lock.name)

                    Spacer()

                    Text(lock.lockState.rawValue.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            lock.lockState == .locked ? Color.green.opacity(0.2) : Color.red.opacity(0.2),
                            in: Capsule()
                        )
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Helpers

    private var isSecure: Bool {
        appState.nightCheck?.allSecure ?? true
    }

    private func formattedDate(_ isoString: String) -> String {
        // Simple formatting — just show time portion
        if let range = isoString.range(of: "T") {
            let time = String(isoString[range.upperBound...].prefix(8))
            return time
        }
        return isoString
    }
}
