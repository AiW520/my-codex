#!/usr/bin/env ruby
# Verify updater metadata against the exact files that GitHub will publish.
require 'yaml'
require 'digest'

directory = ARGV.fetch(0)
names = Dir.children(directory)
names.each do |name|
  abort "Unsafe GitHub asset filename: #{name}" unless name.match?(/\A[0-9A-Za-z._-]+\z/)
end
%w[latest.yml latest-mac.yml latest-linux.yml].each do |name|
  feed = YAML.safe_load(File.read(File.join(directory, name)), permitted_classes: [], aliases: false)
  files = feed.fetch('files')
  abort "Empty updater feed: #{name}" if files.empty?
  files.each do |entry|
    asset = entry.fetch('url')
    abort "Missing updater asset: #{asset}" unless names.include?(asset)
    path = File.join(directory, asset)
    abort "Size mismatch: #{asset}" unless File.size(path) == entry.fetch('size')
    digest = [Digest::SHA512.file(path).digest].pack('m0')
    abort "Checksum mismatch: #{asset}" unless digest == entry.fetch('sha512')
  end
  primary = files.find { |entry| entry.fetch('url') == feed.fetch('path') }
  abort "Invalid primary updater asset: #{name}" unless primary && primary.fetch('sha512') == feed.fetch('sha512')
end
puts 'Release asset names, sizes, and updater checksums verified.'
