import React, {useEffect, useState} from 'react';
import {BackHandler} from 'react-native';
import {HomeScreen} from './screens/HomeScreen';
import {WhoHereScreen} from './screens/WhoHereScreen';

type Screen = {name: 'who'} | {name: 'home'};

export const App = () => {
  const [screen, setScreen] = useState<Screen>({name: 'who'});
  const [profileIds, setProfileIds] = useState<string[]>(['rafi', 'nanu']);

  // Back on Home returns to "Who's here?". Back there falls through and exits the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') {
        setScreen({name: 'who'});
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen.name]);

  return (
    <>
      {screen.name === 'who' ? (
        <WhoHereScreen
          initialSelected={profileIds}
          onContinue={ids => {
            setProfileIds(ids);
            setScreen({name: 'home'});
          }}
        />
      ) : (
        <HomeScreen profileIds={profileIds} onSwitchProfiles={() => setScreen({name: 'who'})} />
      )}
    </>
  );
};
