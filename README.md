# Labeler

Update and assign labels by PR review.

### Config options
|Key                     |Description                               |
|:-----------------------|:-----------------------------------------|
|**`onComment`**         |when a PR review comment is made          |
|**`onChangesRequested`**|when PR is reviewed with changes requested|
|**`onApproved`**        |when a PR is approved                     |

## Create a config file in the root of your project

**File structure**
```
.
│
├── .github 
│   ├── workflows
│   │    ├── labeler-action.yml <------ workflow file
│   │    └── ...
│   └── labeler-config.yml <--------------- config file
│   └── ...
└── ...
```

## Setup config file:
> _this can be named whatever you like, so long as you reference it correctly in the workflow file_
```yml
onComment:
  set:
    - help wanted
    - WIP

onApproved:
  remove:
    - help wanted
  set:
    - First review
    - Ready to merge

onChangesRequested:
  remove:
    - bug
    - invalid
    - duplicate
    - help wanted
  set:
    - Ready to merge
```

## Create a workflow:
```yml
name: Labeler

on: [pull_request_review, pull_request_review_comment]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master
    - name: Labeler
      uses: estrada9166/labeler@v1
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        CONFIG_PATH: labeler-config.yml
```

### How it works
![labeler.gif](https://raw.githubusercontent.com/estrada9166/labeler/v1-release/images/labeler.gif)
