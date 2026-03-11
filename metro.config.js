const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro-config");

const config = getDefaultConfig(__dirname);

// 현재 빌드 플랫폼 확인
const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.argv.includes('--platform web');

module.exports = withNativeWind(config, {
  input: "./global.css",

  // ios일 때 개발 모드에서 스타일링 문제를 해결하기 위해 CSS를 가상 모듈 대신 파일 시스템에 쓰도록 강제합니다.
  //forceWriteFileSystem: true,

  // 웹 테스트에서는 CSS 파일을 가상 모듈로 처리하여 웹에서 스타일링이 제대로 작동하도록 합니다.
  forceWriteFileSystem: false,
});
