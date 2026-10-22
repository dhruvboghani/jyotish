# Adds the GrahavaniWidget (WidgetKit) extension to App.xcodeproj and embeds it in the app. Idempotent.
# Run on macOS: ruby mobile/ios/add-widget.rb   (needs the xcodeproj gem, which ships with CocoaPods)
# Optional env for a signed Release build: TEAM_ID, APP_PROFILE (UUID), WIDGET_PROFILE (UUID).
require 'xcodeproj'

proj_path = File.join(__dir__, 'App', 'App.xcodeproj')
p = Xcodeproj::Project.open(proj_path)
app = p.targets.find { |t| t.name == 'App' }
w = p.targets.find { |t| t.name == 'GrahavaniWidget' }

unless w
  w = p.new_target(:app_extension, 'GrahavaniWidget', :ios, '16.0', nil, :swift)
  group = p.main_group.find_subpath('GrahavaniWidget', true)
  group.set_source_tree('<group>')
  group.set_path('GrahavaniWidget')
  w.add_file_references([group.new_reference('GrahavaniWidget.swift')])
  group.new_reference('Info.plist')
  group.new_reference('GrahavaniWidget.entitlements')
  w.add_system_frameworks(%w[WidgetKit SwiftUI])
  w.build_configurations.each do |c|
    s = c.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.grahavani.app.widget'
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['INFOPLIST_FILE'] = 'GrahavaniWidget/Info.plist'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['CODE_SIGN_ENTITLEMENTS'] = 'GrahavaniWidget/GrahavaniWidget.entitlements'
    s['SWIFT_VERSION'] = '5.0'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
    s['TARGETED_DEVICE_FAMILY'] = '1,2'
    s['MARKETING_VERSION'] = '1.0'
    s['CURRENT_PROJECT_VERSION'] = '$(CURRENT_PROJECT_VERSION)'
    s['SKIP_INSTALL'] = 'YES'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME'] = ''
  end
  app.add_dependency(w)
  embed = app.copy_files_build_phases.find { |b| b.name == 'Embed Foundation Extensions' } || app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
  bf = embed.add_file_reference(w.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

  # The app and the widget share data through this App Group
  ent = File.join(__dir__, 'App', 'App', 'App.entitlements')
  plist = Xcodeproj::Plist.read_from_path(ent)
  plist['com.apple.security.application-groups'] = ['group.com.grahavani.app']
  Xcodeproj::Plist.write_to_path(plist, ent)
  puts 'GrahavaniWidget extension added'
end

if ENV['TEAM_ID'] && ENV['APP_PROFILE'] && ENV['WIDGET_PROFILE']
  { app => ENV['APP_PROFILE'], w => ENV['WIDGET_PROFILE'] }.each do |t, uuid|
    c = t.build_configurations.find { |x| x.name == 'Release' }
    s = c.build_settings
    s['DEVELOPMENT_TEAM'] = ENV['TEAM_ID']
    s['CODE_SIGN_STYLE'] = 'Manual'
    s['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
    s['PROVISIONING_PROFILE_SPECIFIER'] = uuid
  end
  puts 'Release signing set for App and GrahavaniWidget'
end
p.save
