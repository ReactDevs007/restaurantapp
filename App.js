/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useState, useEffect, useCallback} from 'react';
import type {Node} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {PERMISSIONS, check, request, RESULTS} from 'react-native-permissions';

const YELP_KEY =
  'T4v5tNBDzkrfgj884ugGA8p3Wgi-nZmlxv1KZPudU6ch4DfdPmXBkz3Db1vOEPqx0hxI8Q34iZuGKajX0UxXve0bgSn9yz7j57DtULwA0CgQ_hm-R2u3Rq4vZkI8X3Yx';
import Geolocation from 'react-native-geolocation-service';

import Carousel from 'react-native-snap-carousel';

import FastImage from 'react-native-fast-image';
const itemWidth = Dimensions.get('window').width - 60;

const fetchBusinesses = async (keyword, location, offset = 0, limit = 50) => {
  try {
    if (!keyword) {
      console.log('Bad keyword parameter');
    }
    if (!location) {
      console.log('Bad location parameter');
    }
    if (offset < 0) {
      console.log('Bad offset parameter');
    }
    if (limit <= 0) {
      console.log('Bad limit parameter');
    }

    const headers = {
      Authorization: `Bearer ${YELP_KEY}`,
      crossDomain: true,
    };
    let res;

    if (location?.lat)
      res = await fetch(
        `https://api.yelp.com/v3/businesses/search?term=restaurant&latitude=${location?.lat}&longitude=${location?.lon}&offset=${offset}&limit=${limit}`,
        {headers},
      );
    else
      res = await fetch(
        `https://api.yelp.com/v3/businesses/search?term=${keyword}&location=${location}&offset=${offset}&limit=${limit}`,
        {headers},
      );

    if (res.status >= 400) {
      console.log('Bad response from server');
    }
    return res.json();
  } catch (err) {
    console.error(err);
  }
};

const Button = ({text = 'test', backColor = '#DE0200', onPress}) => {
  return (
    <TouchableOpacity
      style={[styles.prevButton, {backgroundColor: backColor}]}
      onPress={onPress}>
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
};
const App: () => Node = () => {
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGPSStatus] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [locViewArgs, setLocViewArgs] = useState(null);
  const [search, setSearch] = useState('');
  const carouselRef = React.useRef(null);

  const time = Date.now();

  const goNext = () => {
    if (!carouselRef || !carouselRef.current) return;
    carouselRef.current.snapToNext();
    if (carouselRef.current.currentIndex === restaurants.length - 4) {
      loadMore();
    }
  };

  const goPrev = () => {
    if (!carouselRef || !carouselRef.current) return;
    carouselRef.current.snapToPrev();
  };

  const updateLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      function (loc) {
        setLoading(false);
        if (loc && loc.coords) {
          setLocViewArgs({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          });
        }
        loadMore();
      },
      function (error) {
        setLoading(false);
        console.log('Error getting location', error);
      },
      {
        timeout: 15000,
      },
    );
  };

  const requestGPSPermission = () => {
    console.log(`[${time}]REQUEST`);
    request(
      Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      }),
    ).then(function (response) {
      console.log(`[${time}]RESPONSE ${response}`);
      console.log(`[${time}]SETTING RESPONSE: ${response}`);
      setGPSStatus(response);
    });
  };
  const loadMore = async () => {
    if (restaurants.length === 0) setLoading(true);
    let res = await fetchBusinesses(
      'restaurant',
      search.length > 0
        ? search
        : locViewArgs != null
        ? locViewArgs
        : 'San Diego',
      restaurants.length,
      12,
    );
    if (restaurants.length === 0) setLoading(false);

    if (res && res.businesses && res.businesses.length > 0) {
      setRestaurants([...restaurants, ...res.businesses]);
    }
  };
  useEffect(() => {
    if (gpsStatus == null) {
      check(
        Platform.select({
          android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        }),
      ).then(function (result) {
        if (result == RESULTS.DENIED) {
          requestGPSPermission();
        } else {
          setGPSStatus(result);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (gpsStatus == RESULTS.GRANTED) {
      updateLocation();
    }
  }, [gpsStatus]);

  const renderItem = ({item, index}) => {
    return (
      <View style={{alignItems: 'center'}}>
        <FastImage
          resizeMode={FastImage.resizeMode.stretch}
          source={{uri: item?.image_url, priority: FastImage.priority.normal}}
          style={styles.imageContainer}
        />
        <View style={styles.rateContainer}>
          <Text style={styles.rateText}>{item?.rating}</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{item?.name}</Text>
        </View>
      </View>
    );
  };

  const onSnapItem = index => {
    if (!carouselRef || !carouselRef.current) return;
    if (index === restaurants.length - 4) {
      loadMore();
    }
  };
  const onSearch = text => {
    setSearch(text);
    setRestaurants([]);
    loadMore();
  };
  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar />
      <TextInput
        onChangeText={text => onSearch(text)}
        style={styles.searchBar}
      />
      <View style={styles.carouselContainer}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Carousel
            data={restaurants}
            ref={carouselRef}
            renderItem={renderItem}
            sliderWidth={itemWidth}
            itemWidth={itemWidth}
            onSnapToItem={onSnapItem}
          />
        )}
      </View>
      <View style={{flex: 1}} />
      <View style={styles.buttonContainer}>
        <Button text={'Previous'} onPress={goPrev} />
        <Button text={'Next'} backColor={'#05CE01'} onPress={goNext} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  prevButton: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DE0200',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 50,
  },
  imageContainer: {
    width: itemWidth,
    height: itemWidth,
    borderRadius: 24,
  },
  carouselContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: itemWidth,
  },
  titleText: {
    textAlign: 'center',
    color: 'white',
    backgroundColor: '#000',
    padding: 5,
    borderRadius: 10,
  },
  rateText: {
    textAlign: 'center',
    color: 'white',
  },
  rateContainer: {
    backgroundColor: '#000',
    position: 'absolute',
    right: 10,
    top: 20,
    width: 32,
    padding: 5,
    borderRadius: 12,
    opacity: 0.8,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#000',
    width: itemWidth - 50,
    padding: 5,
    borderRadius: 10,
    opacity: 0.8,
  },
  searchBar: {
    fontSize: 20,
    margin: 10,
    width: '90%',
    alignSelf: 'center',
    height: 40,
    marginTop: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default App;
