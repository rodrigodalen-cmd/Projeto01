import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../types';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateBolaoScreen } from '../screens/bolao/CreateBolaoScreen';
import { BolaoDetailScreen } from '../screens/bolao/BolaoDetailScreen';
import { JoinBolaoScreen } from '../screens/bolao/JoinBolaoScreen';
import { MakeBetScreen } from '../screens/bet/MakeBetScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Início') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'Buscar') iconName = focused ? 'search' : 'search-outline';
          if (route.name === 'Criar') iconName = 'add-circle';
          if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={route.name === 'Criar' ? 32 : size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen
        name="Buscar"
        component={JoinBolaoScreen}
        initialParams={{ code: '' }}
      />
      <Tab.Screen
        name="Criar"
        component={CreateBolaoScreen}
        options={{ tabBarActiveTintColor: colors.secondary }}
      />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CreateBolao" component={CreateBolaoScreen} />
          <Stack.Screen name="BolaoDetail" component={BolaoDetailScreen} />
          <Stack.Screen name="JoinBolao" component={JoinBolaoScreen} />
          <Stack.Screen name="MakeBet" component={MakeBetScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
