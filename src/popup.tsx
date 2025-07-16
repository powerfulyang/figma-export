import "src/style.scss"

function IndexPopup() {
  const goToOptions = () => {
    return chrome.runtime.openOptionsPage()
  }

  void goToOptions()

  return <div>...</div>
}

export default IndexPopup
