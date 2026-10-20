type NavigationLocation = Pick<Location, "replace">;

function completeLoginNavigation(
  destination: string,
  navigationLocation: NavigationLocation = window.location,
) {
  navigationLocation.replace(destination);
}

export { completeLoginNavigation };
