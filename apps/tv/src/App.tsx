import React, {useCallback, useState} from 'react';
import {Linking, StatusBar} from 'react-native';
import {WhoHereScreen} from './screens/WhoHereScreen';
import {HomeScreen} from './screens/HomeScreen';
import {LaunchingScreen} from './screens/LaunchingScreen';
import {StreamingApp} from './data/streamingApps';
import {colors} from './theme';

type Screen =
  | {name: 'who'}
  | {name: 'home'; profileIds: string[]}
  | {
      name: 'launching';
      profileIds: string[];
      app: StreamingApp;
      status: 'opening' | 'failed';
      message?: string;
    };

export const App = () => {
  const [screen, setScreen] = useState<Screen>({name: 'who'});

  const launchApp = useCallback(async (app: StreamingApp, profileIds: string[]) => {
    setScreen({name: 'launching', profileIds, app, status: 'opening'});
    try {
      const primary = await Linking.canOpenURL(app.uri);
      if (primary) {
        await Linking.openURL(app.uri);
        return;
      }
      if (app.fallbackUri) {
        const fallback = await Linking.canOpenURL(app.fallbackUri);
        if (fallback) {
          await Linking.openURL(app.fallbackUri);
          return;
        }
      }
      setScreen({
        name: 'launching',
        profileIds,
        app,
        status: 'failed',
        message: 'No handler for that URI on this device. Try the Vega Virtual Device or a Vega Fire TV.',
      });
    } catch (e) {
      setScreen({
        name: 'launching',
        profileIds,
        app,
        status: 'failed',
        message: e instanceof Error ? e.message : 'Launch failed',
      });
    }
  }, []);

  return (
    <>
      <StatusBar hidden />
      {screen.name === 'who' ? (
        <WhoHereScreen
          onContinue={profileIds => setScreen({name: 'home', profileIds})}
        />
      ) : null}
      {screen.name === 'home' ? (
        <HomeScreen
          profileIds={screen.profileIds}
          onLaunchApp={app => launchApp(app, screen.profileIds)}
          onSwitchProfiles={() => setScreen({name: 'who'})}
        />
      ) : null}
      {screen.name === 'launching' ? (
        <LaunchingScreen
          appName={screen.app.name}
          status={screen.status}
          message={screen.message}
          onBack={() => setScreen({name: 'home', profileIds: screen.profileIds})}
        />
      ) : null}
    </>
  );
};

// keep colors referenced so theme stays in the bundle path
void colors;
