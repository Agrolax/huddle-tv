import React, {useEffect, useState} from 'react';
import {BackHandler, View} from 'react-native';
import {MessageToast} from './components/MessageToast';
import {HouseholdProvider, useHousehold} from './net/HouseholdContext';
import {HomeScreen} from './screens/HomeScreen';
import {WhoHereScreen} from './screens/WhoHereScreen';

type Screen = {name: 'who'} | {name: 'home'};

const DEFAULT_PROFILES = ['rafi', 'nanu'];

type Props = {
  /** Tests inject a fake socket; the app uses the platform WebSocket. */
  createSocket?: React.ComponentProps<typeof HouseholdProvider>['createSocket'];
};

export const App = ({createSocket}: Props) => (
  <HouseholdProvider initialProfileIds={DEFAULT_PROFILES} createSocket={createSocket}>
    <Screens />
  </HouseholdProvider>
);

function Screens() {
  const [screen, setScreen] = useState<Screen>({name: 'who'});
  const {activeProfileIds, switchProfiles} = useHousehold();

  // Back on Home returns to "Who's here?". Back there falls through and exits the app.
  // Overlays register their own handler later, so they get Back first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') {
        setScreen({name: 'who'});
        return true;
      }
      return false;
    });
    return () => sub?.remove();
  }, [screen.name]);

  return (
    <View style={{flex: 1}}>
      {screen.name === 'who' ? (
        <WhoHereScreen
          // Remount when a phone changes who's here, so the selection matches.
          key={activeProfileIds.join(',')}
          initialSelected={activeProfileIds}
          onContinue={ids => {
            switchProfiles(ids);
            setScreen({name: 'home'});
          }}
        />
      ) : (
        <HomeScreen onSwitchProfiles={() => setScreen({name: 'who'})} />
      )}
      <MessageToast />
    </View>
  );
}
